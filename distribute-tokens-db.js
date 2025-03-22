import { ethers } from "ethers";
import Configs from "./libs/configs-loader.js";
import EstimateGasPTE from "./libs/estimate-gas-pte.js"
import MySQL from "mysql2";

const configs = Configs();
const provider = new ethers.JsonRpcProvider(configs["rpc_address"]);
const contractAddress = configs["pte_contract_address"];
const abi = configs["pte_contract_abi"];
const wallet = new ethers.Wallet(configs["wallet_private_key"], provider);
const contract = new ethers.Contract(contractAddress, abi, wallet);
let requestsRunning = 0;
let quantityToIterate = 0;
let quantityFinished = -1;

const connection = MySQL.createConnection({
    host: configs["distribute_tokens_database_ip"],
    user: configs["distribute_tokens_database_username"],
    password: configs["distribute_tokens_database_password"],
    database: configs["distribute_tokens_database_name"]
});

connection.connect((err) => {
    if (err) {
        console.error('[DISTRIBUTION ERROR] cannot connect to the database: ' + err.stack);
        process.exit(1);
    }
    else {
        console.log('[DISTRIBUTION] Conneceted with id: ' + connection.threadId);
        let tables = configs["distribute_tokens_database_tables"];
        tables.forEach(table => {
            connection.query(
                'SELECT COUNT(*) AS count FROM ??',
                [table],
                async (err, results) => {
                    if (err) {
                        console.error('[DISTRIBUTION ERROR] Failed to get database count: ' + err.stack);
                        process.exit(1);
                    }
                    else {
                        quantityToIterate += results[0].count;
                        if (quantityFinished == -1) quantityFinished = 0;
                        iterateDatabaseWithLimit(table, results[0].count);
                    }
                }
            );
        });
    };
});

async function iterateDatabaseWithLimit(table, databaseLength) {
    console.log("[DISTRIBUTION] " + databaseLength + " entries in " + table);
    for (let i = 0; i < databaseLength; i++) {
        // Wait a while to check if the request is still running
        while (requestsRunning >= parseInt(configs["maximum_requests_per_queue"]))
            await new Promise(resolve => setTimeout(resolve, 100));

        requestsRunning++;

        connection.query(
            'SELECT * FROM ?? LIMIT 1 OFFSET ?',
            [table, i],
            async (err, userData) => {
                if (err) console.error('[DISTRIBUTION ERROR] Failed to get user data: ' + err.stack);
                else if (userData.length == 0) console.log('[DISTRIBUTION ERROR] No register found for index: ' + i);
                else if (userData[0]["walletaddress"] == null) console.log('[DISTRIBUTION] No wallet for index: ' + i);
                else {
                    let success = await distributeToken(userData[0]["walletaddress"], userData[0]["value"]);
                    if (success) {
                        connection.query(
                            'UPDATE ?? SET value = 0 WHERE uniqueid = ?',
                            [table, userData[0]["uniqueid"]],
                            async (err, rows) => {
                                if (err || rows.affectedRows === 0) {
                                    console.error('[DISTRIBUTION FATAL]');
                                    console.error('[DISTRIBUTION FATAL]');
                                    console.error('[DISTRIBUTION ERROR] CANNOT RESET WALLET VALUE AFTER SENDING: ' + err.stack);
                                    console.error('[DISTRIBUTION ERROR] FROM TABLE: ' + table + ", UNIQUEID:" + userData[0]["uniqueid"]);
                                    console.error('[DISTRIBUTION FATAL]');
                                    console.error('[DISTRIBUTION FATAL]');
                                }
                                requestsRunning--;
                                quantityFinished++;
                            }
                        );
                        return;
                    }
                }
                requestsRunning--;
                quantityFinished++;
            }
        );
    }
}

async function distributeToken(key, value) {
    try {
        const minimumValue = configs["minimum_value_to_distribute"];
        if (value < minimumValue) {
            console.warn("[DISTRIBUTION " + key + " ERROR] Ignoring because the value is too low: " + (value / 1e18) + " PTE, wallet: " + key);
            return false;
        }

        let estimatedGas = await EstimateGasPTE("transfer", [key, value]);
        if (estimatedGas == -1) {
            console.warn("[DISTRIBUTION " + key + " ERROR] Ignoring because the estimated gas is invalid, wallet: " + key);
            return false;
        };
        console.log("[DISTRIBUTION " + key + "] Estimated gas: " + estimatedGas + ", running transfer action...");

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

        console.log("[DISTRIBUTION " + key + "] Base Fee: " + baseFee / 1e18);
        console.log("[DISTRIBUTION " + key + "] Minimum: " + maxPriorityFeePerGas / 1e18);
        console.log("[DISTRIBUTION " + key + "] Max Gas: " + maxFeePerGas / 1e18);

        if (maxFeePerGas > gasLimit) {
            console.error("[DISTRIBUTION " + key + " ERROR] Canceling transfer for: " + key + ", the gas limit has reached" +
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
        console.log("[DISTRIBUTION " + key + " SUCCESS] Transaction Success: " + receipt.hash + ", for: " + key);

        return true;
    } catch (error) {
        console.error("[DISTRIBUTION] ERROR: cannot make the transaction, reason: ");
        console.error(error);
        return false;
    }
}

while (true) {
    await new Promise(resolve => setTimeout(resolve, 100));

    if (quantityFinished >= quantityToIterate) break;
}
console.log("[DISTRIBUTION] Finished");
process.exit(0);