let web3 = null;
let accounts = [];
let coreContract = null;
let tokenContract = null;

const CHAIN_ID = 31337;

async function connectWallet() {

    console.log("Step 1");

    if (typeof window.ethereum === "undefined") {
        alert("Please install MetaMask");
        return false;
    }

    console.log("Step 2");

    web3 = new Web3(window.ethereum);

    try {

        console.log("Step 3");

        await ethereum.request({
            method: "eth_requestAccounts"
        });

        console.log("Step 4");

        accounts = await web3.eth.getAccounts();

        console.log(accounts);

        const currentChain = await web3.eth.getChainId();

        console.log("Current Chain:", currentChain);

        if (Number(currentChain) !== CHAIN_ID) {

            console.log("Wrong Chain");

            return false;
        }

        console.log("Step 5");

        tokenContract = new web3.eth.Contract(
            window.BLOCKCHAIN.tokenAbi,
            window.BLOCKCHAIN.tokenAddress
        );

        console.log("Step 6");

        coreContract = new web3.eth.Contract(
            window.BLOCKCHAIN.coreAbi,
            window.BLOCKCHAIN.coreAddress
        );

        console.log("Step 7");

        console.log(coreContract);

        return true;

    } catch(e) {

        console.log("ERROR");

        console.log(e);

        return false;

    }

}