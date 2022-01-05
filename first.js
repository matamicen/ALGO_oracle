const { logicSigFromByte } = require('algosdk');
const algosdk = require('algosdk');
const fs = require('fs');
const utils = require('./utils');
const axios = require('axios');





const keypress = async () => {
    process.stdin.setRawMode(true)
    return new Promise(resolve => process.stdin.once('data', () => {
        process.stdin.setRawMode(false)
        resolve()
    })) 
}

/**
 * Wait until the transaction is confirmed or rejected, or until 'timeout'
 * number of rounds have passed.
 * @param {algosdk.Algodv2} algodClient the Algod V2 client
 * @param {string} txId the transaction ID to wait for
 * @param {number} timeout maximum number of rounds to wait
 * @return {Promise<*>} pending transaction information
 * @throws Throws an error if the transaction is not confirmed or rejected in the next timeout rounds
 */
 const waitForConfirmation = async function (algodClient, txId, timeout) {
    if (algodClient == null || txId == null || timeout < 0) {
        throw new Error("Bad arguments");
    }

    const status = (await algodClient.status().do());
    if (status === undefined) {
        throw new Error("Unable to get node status");
    }

    const startround = status["last-round"] + 1;
    let currentround = startround;

    while (currentround < (startround + timeout)) {
        const pendingInfo = await algodClient.pendingTransactionInformation(txId).do();
        if (pendingInfo !== undefined) {
            if (pendingInfo["confirmed-round"] !== null && pendingInfo["confirmed-round"] > 0) {
                //Got the completed Transaction
                return pendingInfo;
            } else {
                if (pendingInfo["pool-error"] != null && pendingInfo["pool-error"].length > 0) {
                    // If there was a pool error, then the transaction has been rejected!
                    throw new Error("Transaction " + txId + " rejected - pool error: " + pendingInfo["pool-error"]);
                }
            }
        }
        await algodClient.statusAfterBlock(currentround).do();
        currentround++;
    }
    throw new Error("Transaction " + txId + " not confirmed after " + timeout + " rounds!");
};


const createAccount =  function (){
    try{  
        const myaccount = algosdk.generateAccount();
        console.log("Account Address = " + myaccount.addr);
        let account_mnemonic = algosdk.secretKeyToMnemonic(myaccount.sk);
        console.log("Account Mnemonic = "+ account_mnemonic);
        console.log("Account created. Save off Mnemonic and address");
        console.log("Add funds to account using the TestNet Dispenser: ");
        console.log("https://dispenser.testnet.aws.algodev.network/ ");
        return myaccount;
    }
    catch (err) {
        console.log("err", err);
    }
};


async function firstTransaction() {

    try {
        // let myAccount = createAccount();
        let myAccount = createAccount();
        // let myAccount2 = "Q46PIMREWR2NCALI6NG7UL2YK76QZNZCDBXXRHFLNGNLHSWNKZNPUF6XA4"
        console.log("Press any key when the account is funded");
        await keypress();
        // Connect your client
        // const algodToken = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
        // const algodServer = 'http://localhost';
        // const algodPort = 4001;
        const algodToken = '';
        const algodServer = "https://api.testnet.algoexplorer.io";
        const algodPort = '';
        
        let algodClient = new algosdk.Algodv2(algodToken, algodServer,algodPort);
        //Check your balance

        let accountInfo = await algodClient.accountInformation(myAccount.addr).do();
        // let accountInfo = await algodClient.accountInformation(myAccount2).do();
        // console.log(accountInfo);
        console.log("Account balance: %d microAlgos", accountInfo.amount);
        let startingAmount = accountInfo.amount;
        
         // Construct the transaction
         let params = await algodClient.getTransactionParams().do();
         // comment out the next two lines to use suggested fee
         params.fee = 1000;
         params.flatFee = true;
 
         // receiver defined as TestNet faucet address 
         const receiver = "HZ57J3K46JIJXILONBBZOHX6BKPXEM2VVXNRFSUED6DKFD5ZD24PMJ3MVA";
         const enc = new TextEncoder();
         const note = enc.encode("Hello World man!");
         let amount = 5000000;
         let closeout = receiver; //closeRemainderTo
         let sender = myAccount.addr;
         let txn = algosdk.makePaymentTxnWithSuggestedParams(sender, receiver, amount, undefined, note, params);
      
         // Sign the transaction
         let signedTxn = txn.signTxn(myAccount.sk);
         let txId = txn.txID().toString();
         console.log("Signed transaction with txID: %s", txId);
 
         // Submit the transaction
         await algodClient.sendRawTransaction(signedTxn).do();
 
         // Wait for confirmation
         let confirmedTxn = await waitForConfirmation(algodClient, txId, 4);
         //Get the completed Transaction
         console.log("Transaction " + txId + " confirmed in round " + confirmedTxn["confirmed-round"]);
         // let mytxinfo = JSON.stringify(confirmedTxn.txn.txn, undefined, 2);
         // console.log("Transaction information: %o", mytxinfo);
         var string = new TextDecoder().decode(confirmedTxn.txn.txn.note);
         console.log("Note field: ", string);
         accountInfo = await algodClient.accountInformation(myAccount.addr).do();
         console.log("Transaction Amount: %d microAlgos", confirmedTxn.txn.txn.amt);        
         console.log("Transaction Fee: %d microAlgos", confirmedTxn.txn.txn.fee);
         let closeoutamt = startingAmount - confirmedTxn.txn.txn.amt - confirmedTxn.txn.txn.fee;        
         console.log("Close To Amount: %d microAlgos", closeoutamt);
         console.log("Account balance: %d microAlgos", accountInfo.amount);
    }
        catch (err) {
            console.log("err", err);
        }
}

  // compile stateless delegate contract
  async function compileProgram(client, programSource) {
    let encoder = new TextEncoder();
    let programBytes = encoder.encode(programSource);
    let compileResponse = await client.compile(programBytes).do();
    return compileResponse;
}

async function logicSigcTransaction() {

    try {

        const algodToken = '';
        const algodServer = "https://api.testnet.algoexplorer.io";
        const algodPort = '';
        
        let algodClient = new algosdk.Algodv2(algodToken, algodServer,algodPort);


        const status = (await algodClient.status().do());
        if (status === undefined) {
            throw new Error("Unable to get node status");
        }
    
        console.log('lastRound: '+status["last-round"])  
        lastvalid = status["last-round"] + 10


            let compilation = await compileProgram(algodClient, ct_logicsig);
            oracleProgramReferenceProgramBytesReplace = Buffer.from(compilation.result, "base64");
            let program_array = new Uint8Array (oracleProgramReferenceProgramBytesReplace);
            let args = null;
       
        ct_lsig = new algosdk.LogicSigAccount(program_array, args);
        console.log('CT_logicsic_account: '+ct_lsig.address())


            compilation = await compileProgram(algodClient, gt_logicsig);
            oracleProgramReferenceProgramBytesReplace = Buffer.from(compilation.result, "base64");
            program_array = new Uint8Array (oracleProgramReferenceProgramBytesReplace);
            args = null;
       
        gt_lsig = new algosdk.LogicSigAccount(program_array, args);
        console.log('GT_logicsic_account: '+gt_lsig.address())




        await keypress();

        const response =  await axios.post('http://localhost:8080/oracle', {
            // method: 'POST',
            headers: {
              "Access-Control-Allow-Origin": "*",
              'Accept': 'application/json',
              'Content-Type': 'application/json',
            },
            // body: JSON.stringify({
            //   param1: encoded1,
            //   // secondParam: 'yourOtherValue',
            // })
          });
 
       
          console.log("devuelve oracle: " +response.data.signedOracle)
          signedTxn = response.data.signedOracle

        const signed = algosdk.decodeObj(new Uint8Array(Buffer.from(signedTxn, "base64")));
        console.log("decoded:")
          console.log(signed)
        
          // este anda perfecto de abajo
          oracle_lsig = new algosdk.LogicSigAccount(signed.lsig.logic, signed.lsig.args);
       
       
          console.log(oracle_lsig)
          console.log('antes de signar')
          console.log(oracle_lsig.address())
          oracle_lsig.sigkey = signed.sigkey
        //   signed.lsig.sigkey
          oracle_lsig.lsig.sig = signed.lsig.sig
          console.log('despues de signar')
          console.log(oracle_lsig)
          console.log(oracle_lsig.address())
        
         

         // Construct the transaction
         let params = await algodClient.getTransactionParams().do();
         // comment out the next two lines to use suggested fee
         params.fee = 1000;
         params.flatFee = true;
         params.lastRound = params.firstRound + 5

        //  console.log(params)
         console.log('Acaba de llamar al Oracle ... esperando para procesar TXN')
         await keypress();
        
         
         let enc = new TextEncoder();

        // GT paga a CT tx0
            tipoCambio = parseInt("00025000") // tipo de cambio, 4 ultimos son decimales esto deberia venir de la API del oracle
            assetTxfer = 2
            assetTxnferMicroalgo = assetTxfer*1000000
            console.log('se van a enviar 2 assets ')
            console.log("tipo cambio:" + tipoCambio)
            envioAlgos = (assetTxnferMicroalgo*tipoCambio/10000)
            console.log("envioAlgos: "+envioAlgos)

            sender = gt_lsig.address(); // Green Treassury Account
            receiver = ct_lsig.address(); // CT account
            // amount = 2000000;
            amount = envioAlgos;
            note = enc.encode("GT paga");
            let txn0 = algosdk.makePaymentTxnWithSuggestedParams(sender, receiver, amount, undefined, note, params);

        // oracle tx1
            note = algosdk.encodeUint64(tipoCambio);
            amount = 0;
            // let closeout = receiver; //closeRemainderTo
            //  let sender = oracle_sk.addr.toString();
            sender = "YEUJW5EPVUDGXYG67LWCL376GMHYKORJECSB2JAW5WY4ESL3CEHPRSEWX4";
         
            let txn1 = algosdk.makePaymentTxnWithSuggestedParams(sender, sender, amount, undefined, note, params);

        // CT paga a GT tx2
            sender = ct_lsig.address(); // Green Treassury Account
            receiver = gt_lsig.address() // GT account
            // amount = 1000000;
            amount = assetTxnferMicroalgo;
            note = enc.encode("CT paga");
            let txn2 = algosdk.makePaymentTxnWithSuggestedParams(sender, receiver, amount, undefined, note, params);


        // GT llama a APP para restar offset tx3
        
            // let arg0 = enc.encode("payment");
            let arg0 = enc.encode("offset");
            
            appArgs = [arg0]
            // appId = 56326408
            index = 56491067 //appId
            sender = gt_lsig.address(); // Green Treassury Account;

            // create unsigned transaction
            let txn3 = algosdk.makeApplicationNoOpTxn(sender, params, index, appArgs)
            let txId3 = txn3.txID().toString();
        
    

       

        // assign group id to transactions
             algosdk.assignGroupID([txn0, txn1, txn2, txn3]);
        
        // sign transactions
            const stxn0 = algosdk.signLogicSigTransactionObject(txn0, gt_lsig);
            const stxn1 = algosdk.signLogicSigTransactionObject(txn1, oracle_lsig);
            const stxn2 = algosdk.signLogicSigTransactionObject(txn2, ct_lsig);
            const stxn3 = algosdk.signLogicSigTransactionObject(txn3, gt_lsig);

        // send transactions (note that the accounts need to be funded for this to work)
        console.log('Sending transactions...');
        const { txId } = await algodClient.sendRawTransaction([stxn0.blob, stxn1.blob, stxn2.blob, stxn3.blob]).do();

        console.log("atomic:" + txId)

                // wait for confirmation – timeout after 2 rounds
        console.log('Awaiting confirmation (this will take several seconds)...');
        const roundTimeout = 2;
        await utils.waitForConfirmation(algodClient, txId, roundTimeout);
        console.log('Transactions successful.');

      
    }
        catch (err) {
            console.log("err", err);
        }
}


async function call_application()
{

    try {
    const algodToken = '';
    const algodServer = "https://api.testnet.algoexplorer.io";
    const algodPort = '';
    
    let algodClient = new algosdk.Algodv2(algodToken, algodServer,algodPort);
    let encoder = new TextEncoder();
    // let arg0 = encoder.encode("payment");
    let arg0 = encoder.encode("offset");
    
    args = [arg0]
    // appId = 56326408
    appId = 56491067
    // creatorMnemonic = "fork motor sudden garment symbol auto abuse addict ski sing poverty any lecture laundry win dilemma junior bonus harbor chief dinner basket tape absent spot";
    // GMOOLGEIV6MD43MNWEAAUBGYEESEKY4MIRATZ22PTUGH6FIP5DTLKEBEEY

    // creatorMnemonic = "genuine glad cheap pulp vendor forward teach cart cruise creek reopen orphan loyal onion where between fringe piece curtain horror era output design about find";
    // // DV4WM2KPLIRVK6V5DEGX4JCCO4LOTYR6VBUCH7URTOG3QHSWP65343FNXM
    // let sender = algosdk.mnemonicToSecretKey(creatorMnemonic);


    compilation = await compileProgram(algodClient, gt_logicsig);
    oracleProgramReferenceProgramBytesReplace = Buffer.from(compilation.result, "base64");
    program_array = new Uint8Array (oracleProgramReferenceProgramBytesReplace);
    // args = null;
    // let lsig = algosdk.makeLogicSig(program_array, args);
    gt_lsig = new algosdk.LogicSigAccount(program_array, args);
    console.log('GT_logicsic_account: '+gt_lsig.address())

    await callApp(algodClient, gt_lsig, appId, args);

    }
    catch (err) {
        console.log("err", err);
    }
}
// call application 
async function callApp(client, account, index, appArgs) {
    // define sender
    sender = account.address();

    // get node suggested parameters
    let params = await client.getTransactionParams().do();
    // comment out the next two lines to use suggested fee
    params.fee = 1000;
    params.flatFee = true;

    // create unsigned transaction
    let txn = algosdk.makeApplicationNoOpTxn(sender, params, index, appArgs)
    let txId = txn.txID().toString();

    // Sign the transaction
    // let signedTxn = txn.signTxn(account.sk);
    const signedTxn = algosdk.signLogicSigTransactionObject(txn, account);
    
    console.log("Signed transaction with txID: %s", txId);
   

    // Submit the transaction
    // await client.sendRawTransaction(signedTxn).do();
    await client.sendRawTransaction(signedTxn.blob).do();

    // Wait for confirmation
    await waitForConfirmation(client, txId,4);

    // display results
    let transactionResponse = await client.pendingTransactionInformation(txId).do();
    console.log("Called app-id:",transactionResponse['txn']['txn']['apid'])
    // if (transactionResponse['global-state-delta'] !== undefined ) {
    //     console.log("Global State updated:",transactionResponse['global-state-delta']);
    // }
    // if (transactionResponse['local-state-delta'] !== undefined ) {
    //     console.log("Local State updated:",transactionResponse['local-state-delta']);
    // }
}

// create new application
async function createApp(client, creatorAccount, approvalProgram, clearProgram, localInts, localBytes, globalInts, globalBytes) {
    // define sender as creator
    sender = creatorAccount.addr;

    // declare onComplete as NoOp
    onComplete = algosdk.OnApplicationComplete.NoOpOC;

	// get node suggested parameters
    let params = await client.getTransactionParams().do();
    // comment out the next two lines to use suggested fee
    params.fee = 1000;
    params.flatFee = true;
   
   // call application with arguments
   // paso 300 como entero encodeado en uint64 para que convierta bien luego
    let ts = algosdk.encodeUint64(300);
    console.log(ts)
    let app_args = [];
    app_args.push(new Uint8Array(Buffer.from(ts)));
 
    // create unsigned transaction
    let txn = algosdk.makeApplicationCreateTxn(sender, params, onComplete, 
                                            approvalProgram, clearProgram, 
                                            localInts, localBytes, globalInts, globalBytes,app_args);
    let txId = txn.txID().toString();

    // Sign the transaction
    let signedTxn = txn.signTxn(creatorAccount.sk);
    console.log("Signed transaction with txID: %s", txId);
    

    // Submit the transaction
    await client.sendRawTransaction(signedTxn).do();

    // Wait for confirmation
    await waitForConfirmation(client, txId,4);

    // display results
    let transactionResponse = await client.pendingTransactionInformation(txId).do();
    let appId = transactionResponse['application-index'];
    console.log("Created new app-id: ",appId);
    console.log("Stateful address: "+algosdk.getApplicationAddress(appId))
    return appId;
}

async function application_create() {

    try {

        const algodToken = '';
        const algodServer = "https://api.testnet.algoexplorer.io";
        const algodPort = '';
        
        let algodClient = new algosdk.Algodv2(algodToken, algodServer,algodPort);


        const status = (await algodClient.status().do());
        if (status === undefined) {
            throw new Error("Unable to get node status");
        }
    
        console.log('lastRound: '+status["last-round"]) 
        creatorMnemonic = "fork motor sudden garment symbol auto abuse addict ski sing poverty any lecture laundry win dilemma junior bonus harbor chief dinner basket tape absent spot";
        // GMOOLGEIV6MD43MNWEAAUBGYEESEKY4MIRATZ22PTUGH6FIP5DTLKEBEEY

    // get accounts from mnemonic
    let creatorAccount = algosdk.mnemonicToSecretKey(creatorMnemonic);
    // let userAccount = algosdk.mnemonicToSecretKey(userMnemonic);
   


        // declare application state storage (immutable)
localInts = 1;
localBytes = 1;
globalInts = 1;
globalBytes = 0;

// user declared approval program (initial)
var approvalProgramSourceInitial = `#pragma version 5
txn ApplicationID
int 0
==
bnz main_l12
txn OnCompletion
int NoOp
==
bnz main_l9
txn OnCompletion
int DeleteApplication
==
bnz main_l8
txn OnCompletion
int UpdateApplication
==
bnz main_l7
txn OnCompletion
int OptIn
==
txn OnCompletion
int CloseOut
==
||
bnz main_l6
err
main_l6:
int 0
return
main_l7:
int 1
return
main_l8:
int 1
return
main_l9:
txna ApplicationArgs 0
byte "offset"
==
bnz main_l11
err
main_l11:
byte "co2"
byte "co2"
app_global_get
int 10
-
app_global_put
int 1
return
main_l12:
byte "co2"
txna ApplicationArgs 0
btoi
app_global_put
int 1
return
`;


 
// declare clear state program source
clearProgramSource = `#pragma version 2
int 1
`;


    // compile programs 
    let approvalProgram_aux = await compileProgram(algodClient, approvalProgramSourceInitial);
    let approvalProgram = new Uint8Array(Buffer.from(approvalProgram_aux.result, "base64"));
    let clearProgram_aux = await compileProgram(algodClient, clearProgramSource);
    let clearProgram = new Uint8Array(Buffer.from(clearProgram_aux.result, "base64"));

    // create new application
    let appId = await createApp(algodClient, creatorAccount, approvalProgram, clearProgram, localInts, localBytes, globalInts, globalBytes);



    }
    catch (err) {
        console.log("err", err);
    }
}

async function optInApp() {
    try {

    const algodToken = '';
    const algodServer = "https://api.testnet.algoexplorer.io";
    const algodPort = '';
    
    let algodClient = new algosdk.Algodv2(algodToken, algodServer,algodPort);

     optinMnemonic = "fork motor sudden garment symbol auto abuse addict ski sing poverty any lecture laundry win dilemma junior bonus harbor chief dinner basket tape absent spot";
    // GMOOLGEIV6MD43MNWEAAUBGYEESEKY4MIRATZ22PTUGH6FIP5DTLKEBEEY
    let optinAccount = algosdk.mnemonicToSecretKey(optinMnemonic);
    // define sender
    sender = optinAccount.addr;

    // get node suggested parameters
    let params = await algodClient.getTransactionParams().do();
    // comment out the next two lines to use suggested fee
    params.fee = 1000;
    params.flatFee = true;

    const optInTxn = algosdk.makeApplicationOptInTxn(
        optinAccount.addr,
        params,
        56326408
      );
    
      // send the transaction
      console.log('Sending application opt in transaction.');
      const signedOptInTxn = optInTxn.signTxn(optinAccount.sk);
      const { txId: optInTxId } = await algodClient
        .sendRawTransaction(signedOptInTxn)
        .do();

    

    // Wait for confirmation
    await waitForConfirmation(client, txId,4);

    // display results
    let transactionResponse = await algodClient.pendingTransactionInformation(txId).do();
    console.log("Called app-id:",transactionResponse['txn']['txn']['apid'])
    // if (transactionResponse['global-state-delta'] !== undefined ) {
    //     console.log("Global State updated:",transactionResponse['global-state-delta']);
    // }
    // if (transactionResponse['local-state-delta'] !== undefined ) {
    //     console.log("Local State updated:",transactionResponse['local-state-delta']);
    // }
                }
                catch (err) {
                    console.log("err", err);
                }
}

async function optinInAsset(assetId)
{

    try {

        const algodToken = '';
        const algodServer = "https://api.testnet.algoexplorer.io";
        const algodPort = '';
        
        let algodClient = new algosdk.Algodv2(algodToken, algodServer,algodPort);

        // get node suggested parameters
        let suggestedParams = await algodClient.getTransactionParams().do();
        // comment out the next two lines to use suggested fee
        suggestedParams.fee = 1000;
        suggestedParams.flatFee = true;

        console.log(suggestedParams)
        
        amount = 0;

    // gt_logicsig ACCOUNT

        //     compilation = await compileProgram(algodClient, gt_logicsig);
        //     oracleProgramReferenceProgramBytesReplace = Buffer.from(compilation.result, "base64");
        //     program_array = new Uint8Array (oracleProgramReferenceProgramBytesReplace);
        //     args = null;
    
        // gt_lsig = new algosdk.LogicSigAccount(program_array, args);
        // console.log('GT_logicsic_account: '+gt_lsig.address())

        // assetIndex = parseInt(assetId)
        //     // create the asset accept transaction
        // const transactionOptions = {
        //     from: gt_lsig.address(),
        //     to: gt_lsig.address(),
        //     assetIndex,
        //     amount,
        //     suggestedParams,
        // };


     // ct_logicsig ACCOUNT

        let compilation = await compileProgram(algodClient, ct_logicsig);
        oracleProgramReferenceProgramBytesReplace = Buffer.from(compilation.result, "base64");
        let program_array = new Uint8Array (oracleProgramReferenceProgramBytesReplace);
        let args = null;
    
        ct_lsig = new algosdk.LogicSigAccount(program_array, args);
        console.log('CT_logicsic_account: '+ct_lsig.address())

        assetIndex = parseInt(assetId)
            // create the asset accept transaction
        const transactionOptions = {
            from: ct_lsig.address(),
            to: ct_lsig.address(),
            assetIndex,
            amount,
            suggestedParams,
        };


  const txn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject(
    transactionOptions
  );

  // sign the transaction
  
//   const stxn0 = algosdk.signLogicSigTransactionObject(txn, gt_lsig);
     const stxn0 = algosdk.signLogicSigTransactionObject(txn, ct_lsig);

  console.log('OptIn ASA id: '+assetIndex);
      const { txId } = await algodClient.sendRawTransaction(stxn0.blob).do();

      console.log("Txn:" + txId)

    }catch(err) {  
         console.log(err)

    }
}

let gt_logicsig = `#pragma version 5
txn CloseRemainderTo
global ZeroAddress
==
txn RekeyTo
global ZeroAddress
==
&&
txn Fee
int 1000
<=
&&
return
`;

let ct_logicsig = `#pragma version 5
global GroupSize
int 1
==
bnz main_l4
global GroupSize
int 4
==
bnz main_l3
err
main_l3:
txn TypeEnum
int pay
==
global GroupSize
int 4
==
&&
txn CloseRemainderTo
global ZeroAddress
==
&&
txn RekeyTo
global ZeroAddress
==
&&
txn Fee
int 1000
<=
&&
gtxn 1 Sender
addr YEUJW5EPVUDGXYG67LWCL376GMHYKORJECSB2JAW5WY4ESL3CEHPRSEWX4
==
&&
gtxn 0 Amount
int 10000
*
gtxn 1 Note
btoi
/
txn Amount
>=
&&
assert
int 1
return
main_l4:
txn TypeEnum
int axfer
==
txn AssetAmount
int 0
==
&&
txn Sender
txn AssetReceiver
==
&&
assert
int 1
return
`


// firstTransaction()
logicSigcTransaction() //este solo habilitado funciona perfecto 
// application_create() // crea perfectamente el contrato
//   call_application() // llama bien al contrato creado (esta aislado por ahora, solo llama a la aplicacion)
// optInApp() // llame a este para porbar que fallaba y o te dejaba hacer optIn ... igual no tiene sentido hacer optin en este modelo 
// optinInAsset("10458941") // USDC Testnet ASA ID 10458941  