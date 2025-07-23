import { ethers } from "ethers";

import Configs from "./libs/configs-loader.js";
import EstimateGasPTE from "./libs/estimate-gas-pte.js"
import http from 'http';
import MySQL from 'mysql2';

const configs = Configs();
const provider = new ethers.JsonRpcProvider(configs["rpc_address"]);
const contractAddress = configs["pte_contract_address"];
const abi = configs["pte_contract_abi"];
const wallet = new ethers.Wallet(configs["wallet_private_key"], provider);
const contract = new ethers.Contract(contractAddress, abi, wallet);

let connection;
function handleDisconnect() {
    connection = MySQL.createConnection({
        host: configs["request_payment_database_ip"],
        user: configs["request_payment_database_username"],
        password: configs["request_payment_database_password"],
        database: configs["request_payment_database_name"]
    });

    connection.connect(err => {
        if (err) {
            console.error('[PAYMENT] Cannot connect to database:', err);
            setTimeout(handleDisconnect, 2000);
        } else {
            console.log('[PAYMENT] Database connected');
        }
    });

    connection.on('error', err => {
        if (err.code === 'PROTOCOL_CONNECTION_LOST') {
            console.warn('[PAYMENT] Database connection lost. Reconnecting...');
            handleDisconnect();
        } else {
            console.error(err);
            console.error('[PAYMENT] Database unkown error. Reconnecting...');
            handleDisconnect();
        }
    });
}
handleDisconnect();

const ID_REQUESTS = [];
const MAX_REQUESTS = configs["maximum_requests_per_queue"];
function removeIDRequest(uniqueid) {
    const index = ID_REQUESTS.indexOf(uniqueid);
    if (index !== -1) {
        ID_REQUESTS.splice(index, 1);
    }
}

const PORT = 8001;
const server = http.createServer((req, res) => {
    if (ID_REQUESTS.length >= MAX_REQUESTS) {
        res.writeHead(429);
        res.end("Error: Too many requests, please try again later");
        return;
    }

    if (req.method === 'PUT' && req.url === '/requestpayment') {
        const fromHeader = req.headers['from'];

        if (!fromHeader) {
            res.writeHead(400);
            res.end("Error: Missing required fields");
            return;
        }

        let body = '';
        req.on('data', chunk => {
            body += chunk;
        });
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const uniqueid = data.uniqueid;

                if (!uniqueid) {
                    res.writeHead(400);
                    res.end("Error: Missing required fields");
                    return;
                }

                if (ID_REQUESTS.includes(uniqueid)) {
                    res.writeHead(409);
                    res.end("Error: Unique ID already requesting payment");
                    return;
                }

                ID_REQUESTS.push(uniqueid);
                console.log("------------");
                console.log("[PAYMENT] Payment request received from uniqueid: " + uniqueid);

                connection.query(
                    'SELECT walletaddress, value FROM ?? WHERE uniqueid = ?',
                    [fromHeader, uniqueid],
                    async (err, results) => {
                        if (err) {
                            res.writeHead(500);
                            res.end("Error: Database error");
                            console.error("[PAYMENT-" + uniqueid + "] " + err.stack);
                            console.log("------------");
                            removeIDRequest(uniqueid);
                            return;
                        }
                        if (!results.length) {
                            res.writeHead(404);
                            res.end("Error: User not found");
                            console.error("[PAYMENT-" + uniqueid + "] User not found");
                            console.log("------------");
                            removeIDRequest(uniqueid);
                            return;
                        }

                        const { walletaddress, value } = results[0];

                        if (!walletaddress || !value) {
                            res.writeHead(405);
                            res.end("Error: Wallet address or value not found");
                            console.warn("[PAYMENT-" + uniqueid + "] Wallet address or value not found");
                            console.log("------------");
                            removeIDRequest(uniqueid);
                            return;
                        }

                        if (value < configs["minimum_value_to_payment"]) {
                            res.writeHead(406);
                            res.end("Error: Insufficient value to process payment");
                            console.warn("[PAYMENT-" + uniqueid + "] Ignoring because the value is too low: " + (value / 1e18) + " PTE, wallet: " + walletaddress);
                            console.log("------------");
                            removeIDRequest(uniqueid);
                            return;
                        }

                        if (await distributeToken(walletaddress, value)) {
                            connection.query(
                                'UPDATE ?? SET value = 0 WHERE uniqueid = ?',
                                [fromHeader, uniqueid],
                                async (err, rows) => {
                                    if (err || rows.affectedRows === 0) {
                                        console.error('[PAYMENT FATAL]');
                                        console.error('[PAYMENT FATAL]');
                                        console.error('[PAYMENT ERROR] CANNOT RESET WALLET VALUE AFTER SENDING: ' + err.stack);
                                        console.error('[PAYMENT ERROR] FROM TABLE: ' + fromHeader + ", UNIQUEID:" + uniqueid);
                                        console.error('[PAYMENT FATAL]');
                                        console.error('[PAYMENT FATAL]');
                                    }

                                    res.writeHead(200);
                                    res.end();
                                    console.log("[PAYMENT-" + uniqueid + "] Payment Successfully for wallet: " + walletaddress + ", value: " + (value / 1e18) + " PTE");
                                    console.log("------------");
                                    removeIDRequest(uniqueid);
                                }
                            );
                        } else {
                            res.writeHead(500);
                            res.end("Error: Failed to pay, insufficient server gas or insufficient value");
                            console.error("[PAYMENT-" + uniqueid + "] Failed to pay, insufficient server gas or insufficient value");
                            console.log("------------");
                            removeIDRequest(uniqueid);
                        }
                    }
                );
            } catch (e) {
                res.writeHead(400);
                res.end("Error: Invalid JSON");
            }
        });
    } else {
        res.writeHead(404);
        res.end("404 - Not Found");
    }
});

server.listen(PORT, () => {
    console.log(`[PAYMENT] Listening to ${PORT}`);
});

async function distributeToken(key, value) {
    try {
        const minimumValue = configs["minimum_value_to_payment"];
        if (value < minimumValue) {
            console.warn("[PAYMENT " + key + " ERROR] Ignoring because the value is too low: " + (value / 1e18) + " PTE, wallet: " + key);
            return false;
        }

        let estimatedGas = await EstimateGasPTE("transfer", [key, value]);
        if (estimatedGas == -1) {
            console.warn("[PAYMENT " + key + " ERROR] Ignoring because the estimated gas is invalid, wallet: " + key);
            return false;
        };
        console.log("[PAYMENT " + key + "] Estimated gas: " + estimatedGas + ", running transfer action...");

        const privateKey = configs["wallet_private_key"];
        const gasLimit = parseInt(configs["max_gas_per_transaction"]);
        const baseFee = Number((await provider.getBlock("pending")).baseFeePerGas);
        let maxPriorityFeePerGas;
        if (Number(configs["division_fee_gas_per_transaction"]) > 0) {
            const feeDivision = Number(configs["division_fee_gas_per_transaction"]);
            const maxGas = Number((await provider.getFeeData()).maxPriorityFeePerGas);

            maxPriorityFeePerGas = maxGas / feeDivision;
        }
        else maxPriorityFeePerGas = Number((await provider.getFeeData()).maxPriorityFeePerGas);
        let maxFeePerGas = maxPriorityFeePerGas + baseFee - 1;

        maxPriorityFeePerGas += parseInt(configs["additional_fee_gas_per_transaction"]);
        maxFeePerGas += parseInt(configs["additional_fee_gas_per_transaction"]);

        console.log("[PAYMENT " + key + "] Base Fee: " + baseFee / 1e18);
        console.log("[PAYMENT " + key + "] Minimum: " + maxPriorityFeePerGas / 1e18);
        console.log("[PAYMENT " + key + "] Max Gas: " + maxFeePerGas / 1e18);

        if (maxFeePerGas > gasLimit) {
            console.error("[PAYMENT " + key + " ERROR] Canceling transfer for: " + key + ", the gas limit has reached" +
                "\nLimit: " + gasLimit + ", Total Estimated: " + maxFeePerGas);
            return false;
        }

        const tx = await contract.transfer.populateTransaction(key, value);
        tx.gasLimit = estimatedGas;
        tx.maxFeePerGas = maxFeePerGas;
        tx.maxPriorityFeePerGas = maxPriorityFeePerGas;

        const signer = new ethers.Wallet(privateKey, provider);
        const txResponse = await signer.sendTransaction(tx);
        const receipt = await txResponse.wait();
        console.log("[PAYMENT " + key + " SUCCESS] Transaction Success: " + receipt.hash + ", for: " + key);

        return true;
    } catch (error) {
        console.error("[PAYMENT] ERROR: cannot make the transaction, reason: ");
        console.error(error);
        return false;
    }
}