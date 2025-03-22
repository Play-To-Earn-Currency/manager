import { ethers } from "ethers";
import Configs from "./configs-loader.js";

export default async function (action, parameters) {
    const configs = Configs();

    const provider = new ethers.JsonRpcProvider(configs["rpc_address"]);

    const contractAddress = configs["pte_nft_contract_address"];
    const abi = configs["pte_nft_contract_abi"];
    const wallet = new ethers.Wallet(configs["wallet_private_key"], provider);
    const contract = new ethers.Contract(contractAddress, abi, wallet);

    try {
        let gasEstimate;
        switch (action) {
            case "mintNFT":
                gasEstimate = await contract.mintNFT.estimateGas();
                break;
            case "burnNFT":
                gasEstimate = await contract.burnNFT.estimateGas(parameters[0]);
                break;
            default: return -1;
        }

        return gasEstimate;
    } catch (error) {
        console.error("[PTENFT GAS] ERROR: Cannot receive gas estimation, reason: ");
        console.error(error);
        return -1
    }
}