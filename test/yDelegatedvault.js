const Aave = artifacts.require('MockAave')
const Controller = artifacts.require('DelegatedController')
const { MockV2Aggregator } = require('@chainlink/contracts/truffle/v0.6/MockV2Aggregator')
const MockAaveToken = artifacts.require('MockAaveToken')
const LendingPool = artifacts.require('MockLendingPool')
const Oracle = artifacts.require('MockOracle')
const OneSplit = artifacts.require('MockOneSplit')
const Pool = artifacts.require('MockPool')
const Strategy = artifacts.require('MockStrategy')
const Token = artifacts.require('Token')
const yDelegatedVault = artifacts.require('yDelegatedVault')
const {
    BN,
    expectEvent,
    expectRevert
} = require('@openzeppelin/test-helpers')
const {
    applyFee,
    fee,
    tokens
} = require('./helpers/helpers')

contract('yDelegatedVault', (accounts) => {
    const deployer = accounts[0]
    const governance = accounts[1]
    const rewards = accounts[2]
    const user1 = accounts[3]
    const user2 = accounts[4]

    const initialReservePrice = new BN(web3.utils.toWei('0.03'))
    const initialStablePrice = new BN(web3.utils.toWei('0.003'))

    let healthFactor = 4
    let onesplit_returnAmount = 1
    let onesplit_distribution = [1]

    beforeEach(async () => {
        this.underlying = await Token.new({ from: deployer })
        this.token = await MockAaveToken.new(this.underlying.address, { from: deployer })
        this.stable = await Token.new({ from: deployer })
        this.onesplit = await OneSplit.new(
            onesplit_returnAmount,
            onesplit_distribution,
            { from: deployer }
        )
        MockV2Aggregator.setProvider(web3.currentProvider)
        this.feedReserve = await MockV2Aggregator.new(initialReservePrice, { from: deployer })
        this.feedStable = await MockV2Aggregator.new(initialStablePrice, { from: deployer })
        this.lendingPool = await LendingPool.new(
            this.feedReserve.address,
            this.token.address,
            this.feedStable.address,
            this.stable.address,
            { from: deployer }
        )
        this.oracle = await Oracle.new({ from: deployer })
        this.aave = await Aave.new(
            this.lendingPool.address,
            this.oracle.address,
            { from: deployer }
        )
        this.pool = await Pool.new(this.stable.address, { from: deployer })
        this.controller = await Controller.new(
            rewards,
            this.onesplit.address,
            { from: deployer }
        )
        this.vault = await yDelegatedVault.new(
            this.token.address,
            this.controller.address,
            this.aave.address,
            healthFactor,
            { from: deployer }
        )
        this.strategy = await Strategy.new(
            this.controller.address,
            this.onesplit.address,
            this.stable.address,
            this.pool.address,
            { from: deployer }
        )
        await this.oracle.setPriceOracle(
            this.underlying.address,
            this.feedReserve.address,
            { from: deployer }
        )
        await this.oracle.setPriceOracle(
            this.token.address,
            this.feedReserve.address,
            { from: deployer }
        )
        await this.oracle.setPriceOracle(
            this.stable.address,
            this.feedStable.address,
            { from: deployer }
        )
        await this.controller.setStrategy(
            this.vault.address,
            this.strategy.address,
            { from: deployer }
        )
        await this.vault.setGovernance(
            governance,
            { from: deployer }
        )
        await this.controller.setGovernance(
            governance,
            { from: deployer }
        )
        await this.strategy.setGovernance(
            governance,
            { from: deployer }
        )
        await this.token.transfer(user1, tokens(1), { from: deployer })
        await this.token.transfer(user2, tokens(1), { from: deployer })
        await this.stable.transfer(this.lendingPool.address, tokens(30000), { from: deployer })
    })

    it('has expected state on deployment', async () => {
        assert.equal(this.aave.address, await this.vault.aave())
        assert.equal(this.token.address, await this.vault.token())
        assert.equal(this.controller.address, await this.vault.controller())
        assert.equal('yflink Chainlink aToken', await this.vault.name())
        assert.equal('yflaLINK', await this.vault.symbol())
        assert.equal(4, await this.vault.healthFactor())
    })

    describe('deposit', () => {
        it('accepts deposits and provides y token', async () => {
            await this.token.increaseAllowance(this.vault.address, tokens(1), { from: user1 })
            await this.vault.deposit(tokens(1), { from: user1 })
            assert.isTrue(applyFee(tokens(1)).eq(await this.vault.balanceOf(user1)))
            assert.isTrue(fee(tokens(1)).eq(await this.vault.insurance()))
            assert.isTrue(applyFee(tokens(1)).eq(await this.vault.balance()))
            assert.isTrue(applyFee(tokens(1)).eq(await this.vault.totalSupply()))
        })

        context('after initial deposit', () => {
            beforeEach(async () => {
                await this.token.increaseAllowance(this.vault.address, tokens(1), { from: user1 })
                await this.vault.deposit(tokens(1), { from: user1 })
                assert.isTrue(applyFee(tokens(1)).eq(await this.vault.balanceOf(user1)))
            })

            it('accepts additional deposit', async () => {
                await this.token.increaseAllowance(this.vault.address, tokens(1), { from: user2 })
                await this.vault.deposit(tokens(1), { from: user2 })
                assert.isTrue(applyFee(tokens(1)).eq(await this.vault.balanceOf(user2)))
                assert.isTrue(fee(tokens(2)).eq(await this.vault.insurance()))
                assert.isTrue(applyFee(tokens(2)).eq(await this.vault.balance()))
                assert.isTrue(applyFee(tokens(2)).eq(await this.vault.totalSupply()))
            })

            it('has no credit or debt', async () => {
                assert.isTrue(new BN(0).eq(await this.vault.credit()))
                assert.isTrue(new BN(0).eq(await this.vault.debt()))
            })

            it('allows withdraw', async () => {
                await this.vault.withdrawAll({ from: user1 })
                assert.isTrue(applyFee(tokens(1)).eq(await this.token.balanceOf(user1)))
                assert.equal(0, await this.vault.totalSupply())
            })
        })
    })

    describe('setHealthFactor', () => {
        it('only allows governance to call setHealthFactor', async () => {
            await expectRevert(
                this.vault.setHealthFactor(1, { from: deployer }),
                '!governance'
            )
            await this.vault.setHealthFactor(2, { from: governance })
            assert.equal(2, await this.vault.healthFactor())
        })
    })

    describe('setGovernance', () => {
        it('only allows governance to call setGovernance', async () => {
            await expectRevert(
                this.vault.setGovernance(deployer, { from: deployer }),
                '!governance'
            )
            await this.vault.setGovernance(user1, { from: governance })
            assert.equal(user1, await this.vault.governance())
        })
    })

    describe('setController', () => {
        it('only allows governance to call setController', async () => {
            await expectRevert(
                this.vault.setController(deployer, { from: deployer }),
                '!governance'
            )
            await this.vault.setController(user1, { from: governance })
            assert.equal(user1, await this.vault.controller())
        })
    })
})
