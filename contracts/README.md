Bonding Tokens

Overview

Bonding Tokens (BT) are ERC-20 tokens with issuance managed by a bonding curve against a Reserve Token (RT). This system enables dynamic token minting and burning based on market demand, allowing for continuous price discovery without the need for an external exchange or liquidity pool.
Key Concepts
BT: Bonding Tokens, the tokens being bought and sold.
RT: Reserve Tokens, the tokens used to purchase BTs and received upon selling BTs.
Bonding Curve: A mathematical function defining the relationship between BTs and RTs.
Entry Fee: A fee applied when purchasing BTs.
Exit Fee: A fee applied when selling BTs.


Mechanics

Buying BT
Users can buy BTs by depositing RTs into the contract. The amount of BTs minted to the user is determined by the bonding curve, minus an entry fee.


Selling BT
Users can sell BTs to receive RTs. The amount of RTs received by the user is determined by the bonding curve, minus an exit fee.


On entry and exit, the vault takes a fee that increases its reserves and in turn the bonding token price.

Other systems are able to integrate with the Bonding Token by utilizing the ERC20 and ERC4626 functions.
They can deposit tokens and participate in the economy, and they can make donations to the economy to give rewards to bonding token holders.

IMPORTANT:
Depositors are able to get an effective fee discount on entry by splitting their deposits into multiple smaller deposits.
This is because previous deposits are able to capture fee accrual on subsequent deposits.
The impact of issue is mitigated by transaction costs, loss of opportunity for any time interval between deposits, by size of the token economy, and directly by keeping entryFees small.
The entryFee should be regarded as the maximum fee required when depositing X reserve tokens at once.