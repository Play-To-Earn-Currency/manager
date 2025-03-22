import { ethers } from "ethers";
import Configs from "./configs-loader.js";

export default async function (action, parameters) {
    const configs = Configs();

    const provider = new ethers.JsonRpcProvider(configs["rpc_address"]);

    const contractAddress = configs["pte_contract_address"];
    const abi = configs["pte_contract_abi"];
    const wallet = new ethers.Wallet(configs["wallet_private_key"], provider);
    const contract = new ethers.Contract(contractAddress, abi, wallet);

    try {
        let gasEstimate;
        switch (action) {
            case "rewardTokens":
                gasEstimate = await contract.rewardTokens.estimateGas();
                break;
            case "cleanupRewardAddresses":
                gasEstimate = await contract.cleanupRewardAddresses.estimateGas();
                break;
            case "burnCoin":
                gasEstimate = await contract.burnCoin.estimateGas(parameters[0]);
                break;
            case "transfer":
                gasEstimate = await contract.transfer.estimateGas(parameters[0], parameters[1]);
                break;
            case "approve":
                gasEstimate = await contract.approve.estimateGas(parameters[0], parameters[1]);
                break;
            default: return -1;
        }

        return gasEstimate;
    } catch (error) {
        console.error("[PTE GAS] ERROR: Cannot receive gas estimation");
        console.error(error);
        return -1
    }
}