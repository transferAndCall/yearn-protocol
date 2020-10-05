const Aave = artifacts.require('MockAave')
const Controller = artifacts.require('DelegatedController')
const MockAaveToken = artifacts.require('MockAaveToken')
const LendingPool = artifacts.require('MockLendingPool')
const Oracle = artifacts.require('MockOracle')
const OneSplit = artifacts.require('MockOneSplit')
const Pool = artifacts.require('MockPool')
const Strategy = artifacts.require('MockStrategy')
const Token = artifacts.require('Token')
const yDelegatedVault = artifacts.require('yDelegatedVault')
const {
    MockV2Aggregator
} = require('@chainlink/contracts/truffle/v0.6/MockV2Aggregator')
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

    this.reservePrice = new BN(web3.utils.toWei('0.03'))
    this.stablePrice = new BN(web3.utils.toWei('0.003'))
    this.healthFactor = 4
    this.onesplit_returnAmount = 1
    this.onesplit_distribution = [1]

    beforeEach(async () => {
        this.LINK = await Token.new(
            'ChainLink Token',
            'LINK',
            18,
            1000000000,
            { from: deployer }
        )
        this.aLINK = await MockAaveToken.new(this.LINK.address, { from: deployer })
        this.USDC = await Token.new(
            'USD Coin',
            'USDC',
            6,
            30000,
            { from: deployer }
        )
        this.onesplit = await OneSplit.new(
            this.onesplit_returnAmount,
            this.onesplit_distribution,
            { from: deployer }
        )
        MockV2Aggregator.setProvider(web3.currentProvider)
        this.feedReserve = await MockV2Aggregator.new(this.reservePrice, { from: deployer })
        this.feedStable = await MockV2Aggregator.new(this.stablePrice, { from: deployer })
        this.lendingPool = await LendingPool.new(
            this.feedReserve.address,
            this.aLINK.address,
            this.feedStable.address,
            this.USDC.address,
            { from: deployer }
        )
        this.oracle = await Oracle.new({ from: deployer })
        this.aave = await Aave.new(
            this.lendingPool.address,
            this.oracle.address,
            { from: deployer }
        )
        this.pool = await Pool.new(this.USDC.address, { from: deployer })
        this.controller = await Controller.new(
            rewards,
            this.onesplit.address,
            { from: deployer }
        )
        this.vault = await yDelegatedVault.new(
            this.aLINK.address,
            this.controller.address,
            this.aave.address,
            this.healthFactor,
            { from: deployer }
        )
        this.strategy = await Strategy.new(
            this.controller.address,
            this.onesplit.address,
            this.USDC.address,
            this.pool.address,
            { from: deployer }
        )
        await this.oracle.setPriceOracle(
            this.LINK.address,
            this.feedReserve.address,
            { from: deployer }
        )
        await this.oracle.setPriceOracle(
            this.aLINK.address,
            this.feedReserve.address,
            { from: deployer }
        )
        await this.oracle.setPriceOracle(
            this.USDC.address,
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
        await this.aLINK.transfer(user1, tokens(1, 18), { from: deployer })
        await this.aLINK.transfer(user2, tokens(1, 18), { from: deployer })
        await this.USDC.transfer(this.lendingPool.address, tokens(30000, 6), { from: deployer })
    })

    it('has expected state on deployment', async () => {
        assert.equal(this.aave.address, await this.vault.aave())
        assert.equal(this.aLINK.address, await this.vault.token())
        assert.equal(this.controller.address, await this.vault.controller())
        assert.equal('yflink Aave Interest bearing LINK', await this.vault.name())
        assert.equal('yflaLINK', await this.vault.symbol())
        assert.equal(4, await this.vault.healthFactor())
    })

    describe('deposit', () => {
        it('accepts deposits and provides y token', async () => {
            await this.aLINK.increaseAllowance(this.vault.address, tokens(1, 18), { from: user1 })
            await this.vault.deposit(tokens(1, 18), { from: user1 })
            assert.isTrue(applyFee(tokens(1, 18)).eq(await this.vault.balanceOf(user1)))
            assert.isTrue(fee(tokens(1, 18)).eq(await this.vault.insurance()))
            assert.isTrue(applyFee(tokens(1, 18)).eq(await this.vault.balance()))
            assert.isTrue(applyFee(tokens(1, 18)).eq(await this.vault.totalSupply()))
        })

        context('after initial deposit', () => {
            beforeEach(async () => {
                await this.aLINK.increaseAllowance(this.vault.address, tokens(1, 18), { from: user1 })
                await this.vault.deposit(tokens(1, 18), { from: user1 })
                assert.isTrue(applyFee(tokens(1, 18)).eq(await this.vault.balanceOf(user1)))
            })

            it('accepts additional deposit', async () => {
                await this.aLINK.increaseAllowance(this.vault.address, tokens(1, 18), { from: user2 })
                await this.vault.deposit(tokens(1, 18), { from: user2 })
                assert.isTrue(applyFee(tokens(1, 18)).eq(await this.vault.balanceOf(user2)))
                assert.isTrue(fee(tokens(2, 18)).eq(await this.vault.insurance()))
                assert.isTrue(applyFee(tokens(2, 18)).eq(await this.vault.balance()))
                assert.isTrue(applyFee(tokens(2, 18)).eq(await this.vault.totalSupply()))
            })

            it('has no credit or debt', async () => {
                assert.isTrue(new BN(0).eq(await this.vault.credit()))
                assert.isTrue(new BN(0).eq(await this.vault.debt()))
            })

            it('allows withdraw', async () => {
                await this.vault.withdrawAll({ from: user1 })
                assert.isTrue(applyFee(tokens(1, 18)).eq(await this.aLINK.balanceOf(user1)))
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
