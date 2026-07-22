$(document).ready(async function () {

    let connected = await connectWallet();

    if (!connected) {
        return;
    }

    console.log("Core Contract");

    console.log(coreContract);

    console.log("Token Contract");

    console.log(tokenContract);

});