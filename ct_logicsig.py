# This example is provided for informational purposes only and has not been audited for security.

from pyteal import *

"""Basic Bank"""


def greenTreasury_account(receiver):
    """Only allow receiver to withdraw funds from this contract account.

    Args:
        receiver (str): Base 32 Algorand address of the receiver.
    """

    is_payment = Txn.type_enum() == TxnType.Payment
    is_single_tx = Global.group_size() == Int(3)
    # is_correct_receiver = Txn.receiver() == Addr(receiver)
    no_close_out_addr = Txn.close_remainder_to() == Global.zero_address()
    no_rekey_addr = Txn.rekey_to() == Global.zero_address()
    acceptable_fee = Txn.fee() <= Int(1000)
    is_oracle_sender = Gtxn[1].sender() == Addr("YEUJW5EPVUDGXYG67LWCL376GMHYKORJECSB2JAW5WY4ESL3CEHPRSEWX4")
    payment_is_ok = (Gtxn[0].amount() * Int(10000)) / Btoi(Gtxn[1].note()) >= Txn.amount()
    # tx_note = Btoi(Txn.note()) == Int(5)
    # tx_last_valid = Txn.last_valid() <= Int(4)

    return And(
        is_payment,
        is_single_tx,
        # is_correct_receiver,
        no_close_out_addr,
        no_rekey_addr,
        acceptable_fee,
        is_oracle_sender,
        payment_is_ok
        # tx_note,
        # tx_last_valid
    )


if __name__ == "__main__":
    program = greenTreasury_account(
        "ZZAF5ARA4MEC5PVDOP64JM5O5MQST63Q2KOY2FLYFLXXD3PFSNJJBYAFZM"
    )
    print(compileTeal(program, mode=Mode.Signature, version=3))




 #   escrow.teal: E3LXVFBQHN3YM6CUSRWPCEDEZXCAL3AO7XPAADEHIUCSRWOCAOKETPBSQM // este la cuenta del contrato 
#  txid: 3Q4M2N2PWTXRLNY3Y2EIGVZ4JFPDGUVMCYZZHQZRAN4JMJVAUHPA le pase 10 algos


# la cuenta del contrato (address) obtiene cuando se hace  ./sandbox goal clerk compile escrow.teal 
# este escrow.teal sale de la compilacion del escrow.py, luego copie el .teal a la carpeta de ./sandbox pero no reconocia 
# el archivo porque el sandbox esta en docker, entonces con este comando subio el .teal al docker:
# 
# 1) ./sandbox copyTo escrow.teal
# 2) ./sandbox goal clerk compile escrow.teal (aca devuelve el addres del contrato que ya se le puede cargar dinero)
# 3) ./sandbox copyFrom escrow.teal.tok  (este baja el TEAL hecho en BYTES al directorio del sandbox)
# 4) este .tok hay que leerlo desde tx.py y pasarselo al signarlo con transaction.LogicSigAccount(program)