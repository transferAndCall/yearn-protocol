const { BN } = require('@openzeppelin/test-helpers')
const fee = (deposit) => new BN(deposit).div(new BN(2)).div(new BN(100))
exports.applyFee = (deposit) => new BN(deposit).sub(fee(deposit))
exports.fee = fee
exports.tokens = (amount, decimals) => new BN(amount.toString()).mul(new BN('10').pow(new BN(decimals.toString())))
