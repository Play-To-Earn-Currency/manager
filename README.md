# PTE Manager
A utility tool for managing play to earn token and nft

To use this utility you need to install nodejs in your machine, after that clone this repository and open the terminal inside the repository.
Type ``npm install`` to install the necessary dependencies, and use ``node init.js`` to start the utility, don't forget to check the ``configs.txt``

For server owners you can use ``node distribute-tokens-type.js`` to automatically distribute PTE across wallets

The values inside the configs.txt are measured in wei so: ``1000000000000000000`` equals ``1`` PTE, or POL depending on the context

### Configurations
- pte_nft_contract_address: the address for the PTENFT contract
- pte_nft_contract_abi: you can get the abi in the PTENFT contract on polygon
- pte_contract_address: the address for the PTE contract
- pte_contract_abi: you can get the abi in the PTE contract on polygon
- pte_reward_per_seconds: how much seconds to retry the rewardTokens function when you initialize the ``pte rewardtokens auto``
- rpc_address: the rpc connection that will handle your requests to the block chain
- wallet_private_key: your PRIVATE KEY from your wallet, used for transactions, very secret be careful and do not share
- max_gas_per_transaction: the max gas limit for transactions
- additional_fee_gas_per_transaction: additional gas per transaction for speed up the transactions
- distribute_tokens_file_path: the actual path for the wallets values location, consider adding the full path in this config
- minimum_value_to_distribute: minimum value to distribute the token
- maximum_requests_per_queue: amount of requests simultaneously
- distribute_tokens_database_ip: ip address for database
- distribute_tokens_database_name: the database name (default pte_wallets)
- distribute_tokens_database_username: username for database (default pte_admin)
- distribute_tokens_database_password: user password for database (no default, please change it)
- distribute_tokens_database_tables: created tables for distributing

### Estimate Commands
- estimategas ptenft mintnft: gets the gas chance to consume in the mintNFT action from PTE NFT (Administrator Only)
- estimategas ptenft burnnft: gets the gas chance to consume in the burnNFT action from PTE NFT
- estimategas pte rewardtokens: gets the gas chance to consume in the rewardTokens action from PTE Coin
- estimategas pte cleanuprewardaddresses: gets the gas chance to consume in the cleanupRewardAddresses action from PTE Coin (Administrator Only)
- estimategas pte burncoin: gets the gas chance to consume in the burnCoin action from PTE Coin
- estimategas pte transfer: gets the gas chance to consume on transfering PTE Coins

### PTE Commands
- pte rewardtokens auto: every ``pte_reward_per_seconds`` will call the reedemTokens function in the PTE Coin, type again to disable, or close the application
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

# Scripts

### Automatic Pay system Database
Inside the scripts folders you can find the ``periodic-pay-db.sh``, this shellscript will automatically pay player every set up time
- example: ``./periodic-pay-db.sh --sleepTime 86400 --distributeScript /home/user/manager/distribute-tokens-db.js``

The same can be found for database in ``periodic-pay-db.sh``

You can use the parameter ``--now`` for force pay after starting the script

``configs.txt`` needs to be setup correctly

### Automatic Pay system JSON
Inside the scripts folders you can find the ``periodic-pay-json.sh``, this shellscript will automatically pay player every set up time
- example: ``./periodic-pay-json.sh --sleepTime 86400 --lockPath /home/user/gameserver/wallets/wallet.lock --resyncPath /home/user/gameserver/wallets/wallet.resync --distributeScript /home/user/manager/distribute-tokens-json.js``

The same can be found for database in ``periodic-pay-db.sh``

You can use the parameter ``--now`` for force pay after starting the script

``configs.txt`` needs to be setup correctly