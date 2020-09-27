const { BN } = require('@openzeppelin/test-helpers')
const fee = (deposit) => new BN(deposit).div(new BN(2)).div(new BN(100))
exports.applyFee = (deposit) => new BN(deposit).sub(fee(deposit))
exports.fee = fee
exports.tokens = (amount) => new BN(web3.utils.toWei(amount.toString()))
