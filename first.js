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
        // tomo el teal compilado del oracle
        // cat logicsigOracle.teal.tok | base64 para generar el programa en base64
        // oracleProgramReferenceProgramBytesReplace = Buffer.from("ASADAegHBSYBIM5AXoIg4wguvqNz/cSzrushKftw0p2NFXgq73Ht5ZNSMRAiEjIEIhIQMQcoEhAxCTIDEhAxASMOEDEFFyQSEA==", "base64");
        // // oracleProgramReferenceProgramBytesReplace = Buffer.from("ASAEAZChDwUGJgEgK+3MznfMOKICd7ZFpboZ5Q4jRSP/getreWQoYDjPqqMxECISMQEyABIQMQgjDxAxBygSEDEJMgMSEDEFFyQSEDEEJQ4Q", "base64");
                                                                    
        // console.log('antes de inyectar:')
        // console.log(oracleProgramReferenceProgramBytesReplace)
        
        // // let referenceOffsets = [ /*Price*/ 7, /*LastValid*/ 8];
        // // let injectionVector =  [8, 9];
        // // let injectionTypes = [templates.valTypes.INT, templates.valTypes.INT];
        // let referenceOffsets = [ /*Price*/ 6];
        // let injectionVector =  [8];
        // let injectionTypes = [templates.valTypes.INT];
        
        // var buff = templates.inject (oracleProgramReferenceProgramBytesReplace, referenceOffsets, injectionVector, injectionTypes);
        // // var buff = templates.inject (oracleProgramReferenceProgramBytesReplace, referenceOffsets, injectionVector);
        // console.log('despues de inyectar:')
        // console.log(buff)

        // let program = new Uint8Array (buff); 
        // // let program = Buffer.from("AyACAegHJgEgzkBegiDjCC6+o3P9xLOu6yEp+3DSnY0VeCrvce3lk1IxECISMgQiEhAxBygSEDEJMgMSEDEgMgMSEDEBIw4QQw==", "base64");  // let program = new Uint8Array(Buffer.from("AyACAegHJgEgzkBegiDjCC6+o3P9xLOu6yEp+3DSnY0VeCrvce3lk1IxECISMgQiEhAxBygSEDEJMgMSEDEgMgMSEDEBIw4QQw==", "base64"));


        const status = (await algodClient.status().do());
        if (status === undefined) {
            throw new Error("Unable to get node status");
        }
    
        console.log('lastRound: '+status["last-round"])  
        lastvalid = status["last-round"] + 10

let oracleTemplate = `
#pragma version 3
txn TypeEnum
int pay
==
global GroupSize
int 3
==
&&
txn Receiver
addr YEUJW5EPVUDGXYG67LWCL376GMHYKORJECSB2JAW5WY4ESL3CEHPRSEWX4
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
txn Note
btoi
int <exchange_rate>
==
&&
txn LastValid
int <lastvalid>
<=
&&
return
`;

let gt_logicsig = `
#pragma version 3
txn TypeEnum
int pay
==
global GroupSize
int 3
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
return
`;

let ct_logicsig = `
#pragma version 3
txn TypeEnum
int pay
==
global GroupSize
int 3
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
return
`;
        let compilation = await compileProgram(algodClient, ct_logicsig);
        oracleProgramReferenceProgramBytesReplace = Buffer.from(compilation.result, "base64");
        let program_array = new Uint8Array (oracleProgramReferenceProgramBytesReplace);
        let args = null;
        // let lsig = algosdk.makeLogicSig(program_array, args);
        ct_lsig = new algosdk.LogicSigAccount(program_array, args);
        console.log('CT_logicsic_account: '+ct_lsig.address())


        compilation = await compileProgram(algodClient, gt_logicsig);
        oracleProgramReferenceProgramBytesReplace = Buffer.from(compilation.result, "base64");
        program_array = new Uint8Array (oracleProgramReferenceProgramBytesReplace);
        args = null;
        // let lsig = algosdk.makeLogicSig(program_array, args);
        gt_lsig = new algosdk.LogicSigAccount(program_array, args);
        console.log('GT_logicsic_account: '+gt_lsig.address())






        // oracle desde aca - se cambio por la llamada al backend

        // oracleTemplate = oracleTemplate.replace("<exchange_rate>", parseInt("00025000"));    
        // let program = oracleTemplate.replace("<lastvalid>", lastvalid); 
        // console.log(program)
        // compilation = await compileProgram(algodClient, program);
        // //generate unique filename
        // // let uintAr = _base64ToArrayBuffer(compilation.result);
        // console.log(compilation.result)
        // oracleProgramReferenceProgramBytesReplace = Buffer.from(compilation.result, "base64");
        // console.log(oracleProgramReferenceProgramBytesReplace)
        // program_array = new Uint8Array (oracleProgramReferenceProgramBytesReplace);
        // args = null;
        // // let lsig = algosdk.makeLogicSig(program_array, args);
        // oracle_lsig = new algosdk.LogicSigAccount(program_array, args);
        // console.log('Oracle_logicsic_account: '+oracle_lsig.address())

        // let oracle_sk = algosdk.mnemonicToSecretKey("popular sauce pride off fluid you come coffee display list stadium blood scout bargain segment laptop hand employ demise grass sign adult want abstract exhibit")
        // console.log(oracle_sk.addr.toString())
        // oracle_lsig.sign(oracle_sk.sk);

        // let accountInfo = await algodClient.accountInformation(oracle_sk.addr).do();
        // // let accountInfo = await algodClient.accountInformation(myAccount2).do();
        // // console.log(accountInfo);
        // console.log("Account balance: %d microAlgos", accountInfo.amount);
        // let startingAmount = accountInfo.amount;
        
         // fin oracle desde aca - se cambio por la llamada al backend


        //  const response =  await fetch('http://localhost:8080/oracle', {
        //     method: 'POST',
        //     headers: {
        //       "Access-Control-Allow-Origin": "*",
        //       'Accept': 'application/json',
        //       'Content-Type': 'application/json',
        //     },
        //     // body: JSON.stringify({
        //     //   param1: encoded1,
        //     //   // secondParam: 'yourOtherValue',
        //     // })
        //   });
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
 
        //   console.log("devuelve oracle: " +response.data)
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
        
        //   console.log('Oracle_logicsic_account: '+oracle_lsig.address())
          
        //   console.log("oracle  signed address:")
        //   var string = new TextDecoder().decode(oracle_lsig.lsig.sig);
        //   console.log(string)
            // let decodedLsig = signed.sig;
            // anda esto de abajo 2 lineas
        //   oracle_lsig = new algosdk.LogicSigAccount(signed.lsig.logic, signed.lsig.args);
        //   console.log('Oracle_logicsic_account: '+oracle_lsig.address())


        //   sigOracle = algosdk.makeLogicSig(decodedLsig.l, decodedLsig.arg);
        //   await algodClient.sendRawTransaction(signed.blob).do();
         

         // Construct the transaction
         let params = await algodClient.getTransactionParams().do();
         // comment out the next two lines to use suggested fee
         params.fee = 1000;
         params.flatFee = true;
         params.lastRound = params.firstRound + 5

         console.log(params)
         await keypress();
 
         // receiver defined as TestNet faucet address 
         receiver = "HZ57J3K46JIJXILONBBZOHX6BKPXEM2VVXNRFSUED6DKFD5ZD24PMJ3MVA";
         const enc = new TextEncoder();
        //  const note = enc.encode("5");
         tipoCambio = parseInt("00025000") // tipo de cambio, 4 ultimos son decimales
         note = algosdk.encodeUint64(tipoCambio);
         let amount = 0;
         let closeout = receiver; //closeRemainderTo
        //  let sender = oracle_sk.addr.toString();
        let sender = "YEUJW5EPVUDGXYG67LWCL376GMHYKORJECSB2JAW5WY4ESL3CEHPRSEWX4";
         
        
         // oracle tx1
         let txn1 = algosdk.makePaymentTxnWithSuggestedParams(sender, sender, amount, undefined, note, params);


           // sign transaction with logic signature

            // const lstx = algosdk.signLogicSigTransactionObject(txn1, lsig);

            // send transaction (it should fail because of the logic signature, which returns 0)
            // console.log('Sending transaction...');
            // tx = await algodClient.sendRawTransaction(lstx.blob).do();
            // console.log(tx);

            assetTxfer = 2
            assetTxnferMicroalgo = assetTxfer*1000000
            console.log('se van a enviar 2 assets ')
            // tipoCambio = parseInt("00025000") // tipo de cambio, 4 ultimos son decimales
            console.log("tipo cambio:" + tipoCambio)
            envioAlgos = (assetTxnferMicroalgo*tipoCambio/10000)
            // console.log("aplico cambio: "+aplicoCambio)
            // envioAlgosRedondeo = Math.ceil(aplicoCambio)
            // envioAlgos = aplicoCambio*1000000;
            console.log("envioAlgos: "+envioAlgos)

        // GT paga a CT tx0
        sender = gt_lsig.address(); // Green Treassury Account
        receiver = ct_lsig.address(); // CT account
        // amount = 2000000;
        amount = envioAlgos;
        note = enc.encode("GT paga");
        let txn0 = algosdk.makePaymentTxnWithSuggestedParams(sender, receiver, amount, undefined, note, params);

        // CT paga a GT tx2
        sender = ct_lsig.address(); // Green Treassury Account
        receiver = gt_lsig.address() // GT account
        // amount = 1000000;
        amount = assetTxnferMicroalgo;
        note = enc.encode("CT paga");
        let txn2 = algosdk.makePaymentTxnWithSuggestedParams(sender, receiver, amount, undefined, note, params);

          // assign group id to transactions
        algosdk.assignGroupID([txn0, txn1, txn2]);
        
        // sign transactions
        // const stxn0 = txn0.signTxn(gt_lsig.sk);
        const stxn0 = algosdk.signLogicSigTransactionObject(txn0, gt_lsig);
        const stxn1 = algosdk.signLogicSigTransactionObject(txn1, oracle_lsig);
        const stxn2 = algosdk.signLogicSigTransactionObject(txn2, ct_lsig);

        // send transactions (note that the accounts need to be funded for this to work)
        console.log('Sending transactions...');
        const { txId } = await algodClient.sendRawTransaction([stxn0.blob, stxn1.blob, stxn2.blob]).do();

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

// firstTransaction()
logicSigcTransaction()