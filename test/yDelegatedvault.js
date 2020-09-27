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

    let aave, controller, feedReserve, feedStable, lendingPool, pool, oracle, onesplit, strategy, stable, token, vault, underlying

    beforeEach(async () => {
        underlying = await Token.new({ from: deployer })
        token = await MockAaveToken.new(underlying.address, { from: deployer })
        stable = await Token.new({ from: deployer })
        onesplit = await OneSplit.new(
            onesplit_returnAmount,
            onesplit_distribution,
            { from: deployer }
        )
        MockV2Aggregator.setProvider(web3.currentProvider)
        feedReserve = await MockV2Aggregator.new(initialReservePrice, { from: deployer })
        feedStable = await MockV2Aggregator.new(initialStablePrice, { from: deployer })
        lendingPool = await LendingPool.new(
            feedReserve.address,
            token.address,
            feedStable.address,
            stable.address,
            { from: deployer }
        )
        oracle = await Oracle.new({ from: deployer })
        aave = await Aave.new(
            lendingPool.address,
            oracle.address,
            { from: deployer }
        )
        pool = await Pool.new(stable.address, { from: deployer })
        controller = await Controller.new(
            rewards,
            onesplit.address,
            { from: deployer }
        )
        vault = await yDelegatedVault.new(
            token.address,
            controller.address,
            aave.address,
            healthFactor,
            { from: deployer }
        )
        strategy = await Strategy.new(
            controller.address,
            onesplit.address,
            stable.address,
            pool.address,
            { from: deployer }
        )
        await oracle.setPriceOracle(
            underlying.address,
            feedReserve.address,
            { from: deployer }
        )
        await oracle.setPriceOracle(
            token.address,
            feedReserve.address,
            { from: deployer }
        )
        await oracle.setPriceOracle(
            stable.address,
            feedStable.address,
            { from: deployer }
        )
        await controller.setStrategy(
            vault.address,
            strategy.address,
            { from: deployer }
        )
        await vault.setGovernance(
            governance,
            { from: deployer }
        )
        await controller.setGovernance(
            governance,
            { from: deployer }
        )
        await strategy.setGovernance(
            governance,
            { from: deployer }
        )
        await token.transfer(user1, tokens(1), { from: deployer })
        await token.transfer(user2, tokens(1), { from: deployer })
        await stable.transfer(lendingPool.address, tokens(30000), { from: deployer })
    })

    it('has expected state on deployment', async () => {
        assert.equal(aave.address, await vault.aave())
        assert.equal(token.address, await vault.token())
        assert.equal(controller.address, await vault.controller())
        assert.equal('yflink Chainlink aToken', await vault.name())
        assert.equal('yflaLINK', await vault.symbol())
        assert.equal(4, await vault.healthFactor())
    })

    describe('deposit', () => {
        it('accepts deposits and provides y token', async () => {
            await token.increaseAllowance(vault.address, tokens(1), { from: user1 })
            await vault.deposit(tokens(1), { from: user1 })
            assert.isTrue(applyFee(tokens(1)).eq(await vault.balanceOf(user1)))
            assert.isTrue(fee(tokens(1)).eq(await vault.insurance()))
            assert.isTrue(applyFee(tokens(1)).eq(await vault.balance()))
            assert.isTrue(applyFee(tokens(1)).eq(await vault.totalSupply()))
        })

        context('after initial deposit', () => {
            beforeEach(async () => {
                await token.increaseAllowance(vault.address, tokens(1), { from: user1 })
                await vault.deposit(tokens(1), { from: user1 })
                assert.isTrue(applyFee(tokens(1)).eq(await vault.balanceOf(user1)))
            })

            it('accepts additional deposit', async () => {
                await token.increaseAllowance(vault.address, tokens(1), { from: user2 })
                await vault.deposit(tokens(1), { from: user2 })
                assert.isTrue(applyFee(tokens(1)).eq(await vault.balanceOf(user2)))
                assert.isTrue(fee(tokens(2)).eq(await vault.insurance()))
                assert.isTrue(applyFee(tokens(2)).eq(await vault.balance()))
                assert.isTrue(applyFee(tokens(2)).eq(await vault.totalSupply()))
            })

            it('has no credit or debt', async () => {
                assert.isTrue(new BN(0).eq(await vault.credit()))
                assert.isTrue(new BN(0).eq(await vault.debt()))
            })

            it('allows withdraw', async () => {
                await vault.withdrawAll({ from: user1 })
                assert.isTrue(applyFee(tokens(1)).eq(await token.balanceOf(user1)))
                assert.equal(0, await vault.totalSupply())
            })
        })
    })

    describe('setHealthFactor', () => {
        it('only allows governance to call setHealthFactor', async () => {
            await expectRevert(
                vault.setHealthFactor(1, { from: deployer }),
                '!governance'
            )
            await vault.setHealthFactor(2, { from: governance })
            assert.equal(2, await vault.healthFactor())
        })
    })

    describe('setGovernance', () => {
        it('only allows governance to call setGovernance', async () => {
            await expectRevert(
                vault.setGovernance(deployer, { from: deployer }),
                '!governance'
            )
            await vault.setGovernance(user1, { from: governance })
            assert.equal(user1, await vault.governance())
        })
    })

    describe('setController', () => {
        it('only allows governance to call setController', async () => {
            await expectRevert(
                vault.setController(deployer, { from: deployer }),
                '!governance'
            )
            await vault.setController(user1, { from: governance })
            assert.equal(user1, await vault.controller())
        })
    })
})
