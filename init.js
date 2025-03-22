import EstimateGasPTENFT from "./libs/estimate-gas-ptenft.js"
import EstimateGasPTE from "./libs/estimate-gas-pte.js"
import PTEBurncoin from "./libs/pte-burncoin.js"
import PTETransfer from "./libs/pte-transfer.js"
import PTEReward from "./libs/pte-rewardtokens.js"
import PTEApprove from "./libs/pte-approve.js"
import PTENFTBurn from "./libs/ptenft-burnnft.js"
import PTENFTMint from "./libs/ptenft-mintnft.js"
import readline from 'readline';
import { exec } from "child_process";
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const helpText = `
### Estimate Commands
- estimategas ptenft mintnft: gets the gas chance to consume in the mintNFT action from PTE NFT (Administrator Only)
- estimategas ptenft burnnft: gets the gas chance to consume in the burnNFT action from PTE NFT
- estimategas pte rewardtokens: gets the gas chance to consume in the rewardTokens action from PTE Coin
- estimategas pte cleanuprewardaddresses: gets the gas chance to consume in the cleanupRewardAddresses action from PTE Coin (Administrator Only)
- estimategas pte burncoin: gets the gas chance to consume in the burnCoin action from PTE Coin
- estimategas pte transfer: gets the gas chance to consume on transfering PTE Coins

### PTE Commands
- pte rewardtokens auto: every pte_reward_per_seconds will call the reedemTokens function in the PTE Coin, type again to disable, or close the application
- pte rewardtokens: will call the reedemTokens function in the PTE Coin
- pte transfer: transfer a quantity of tokens to the desired address
- pte burncoin: burns a selected amount of tokens
- pte approve: allow the provided address spend provided amount of PTE from your wallet

### PTENFT Commands
- ptenft mint: generates a new NFT (Administrator Only)
- ptenft burnnft: burns the token nft provided

### Server Owners Commands
- distributejson: starts distributing the tokens to the loved players (json)
- distributedb: starts distributing the tokens to the loved players (database)
- > Executing this command will instantly start distributing, be careful
`;

// Interface creation
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Terminal welcome
console.log("--PTE Manager 1.0--");

// Command proccess
async function processInput(input) {
    const command = input.toLowerCase();

    // Complex Commands
    if (command.startsWith("pte transfer")) {
        const [, , address, amount] = command.split(" ");
        await PTETransfer(address, amount);
        askForInput();
        return;
    } else if (command.startsWith("pte burncoin")) {
        const [, , amount] = command.split(" ");
        await PTEBurncoin(amount);
        askForInput();
        return;
    } else if (command.startsWith("pte approve")) {
        const [, , address, amount] = command.split(" ");
        await PTEApprove(address, amount);
        askForInput();
        return;
    } else if (command.startsWith("ptenft burnnft")) {
        const [, , token] = command.split(" ");
        await PTENFTBurn(token);
        askForInput();
        return;
    } else if (command.startsWith("estimategas ptenft burnnft")) {
        const [, , , token] = command.split(" ");
        console.log("Gas: " + await EstimateGasPTENFT("burnNFT", [token]));
        askForInput();
        return;
    }

    // Simple Commands
    switch (command) {
        // Estimate Gas PTE NFT
        case 'estimategas ptenft mintnft':
            console.log("Gas: " + await EstimateGasPTENFT("mintNFT"));
            break;
        // Estimate Gas PTE
        case 'estimategas pte rewardtokens':
            console.log("Gas: " + await EstimateGasPTE("rewardTokens"));
            break;
        case 'estimategas pte cleanuprewardaddresses':
            console.log("Gas: " + await EstimateGasPTE("cleanupRewardAddresses"));
            break;
        case 'estimategas pte burncoin':
            console.log("Gas: " + await EstimateGasPTE("burnCoin", [100]));
            break;
        case 'estimategas pte transfer':
            console.log("Gas: " + await EstimateGasPTE("transfer", ["0x0F7cc40aD5E2331770F49119c1B595EDD3266307", 100]));
            break;
        case 'estimategas pte approve':
            console.log("Gas: " + await EstimateGasPTE("approve", ["0x0F7cc40aD5E2331770F49119c1B595EDD3266307", 100]));
            break;
        // PTE
        case 'pte rewardtokens auto':
            await PTEReward(true);
            break;
        case 'pte rewardtokens':
            await PTEReward(false);
            break;
        // PTE NFT
        case 'ptenft mint':
            await PTENFTMint();
            break;
        // Others
        case 'distributejson': {
            const __filename = fileURLToPath(import.meta.url);
            const __dirname = dirname(__filename);
            const distributePath = resolve(__dirname, "distribute-tokens-json.js");
            exec(`node ${distributePath}`, (error, stdout, stderr) => {
                if (error) {
                    console.error(error);
                    return;
                }
                if (stderr) {
                    console.error(stderr);
                    return;
                }
                console.log(stdout);
            });
        }
            break;
        case 'distributedb': {
            const __filename = fileURLToPath(import.meta.url);
            const __dirname = dirname(__filename);
            const distributePath = resolve(__dirname, "distribute-tokens-db.js");
            exec(`node ${distributePath}`, (error, stdout, stderr) => {
                if (error) {
                    console.error(error);
                    return;
                }
                if (stderr) {
                    console.error(stderr);
                    return;
                }
                console.log(stdout);
            });
        }
            break;
        case 'help':
            console.log(helpText);
            break;
        case 'exit':
            rl.close();
            return;
        default:
            console.log(`Unkown command: ${command}, type help to view the command list`);
    }

    askForInput();
}

function askForInput() { rl.question("", processInput); }
askForInput();

rl.on("close", () => {
    console.log("Goodbye.");
    process.exit(0);
});