const Aave = artifacts.require('MockAave')
const Controller = artifacts.require('DelegatedController')
const LendingPool = artifacts.require('MockLendingPool')
const OneSplit = artifacts.require('MockOneSplit')
const Pool = artifacts.require('MockPool')
const Strategy = artifacts.require('MockStrategy')
const Token = artifacts.require('Token')
const yDelegatedVault = artifacts.require('yDelegatedVault')
const { expectEvent, expectRevert } = require('@openzeppelin/test-helpers')

contract('yDelegatedVault', (accounts) => {
    const deployer = accounts[0]
    const governance = accounts[1]
    const rewards = accounts[2]
    const user = accounts[3]

    let healthFactor = 4
    let onesplit_returnAmount = 1
    let onesplit_distribution = [1]

    let aave, controller, lendingPool, pool, onesplit, strategy, token, vault

    beforeEach(async () => {
        token = await Token.new({ from: deployer })
        onesplit = await OneSplit.new(
            onesplit_returnAmount,
            onesplit_distribution,
            { from: deployer }
        )
        lendingPool = await LendingPool.new({ from: deployer })
        aave = await Aave.new(lendingPool.address, { from: deployer })
        pool = await Pool.new(token.address, { from: deployer })
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
        await token.transfer(user, 100, { from: deployer })
    })

    it('has expected state on deployment', async () => {
        assert.equal(aave.address, await vault.aave())
        assert.equal(token.address, await vault.token())
        assert.equal(controller.address, await vault.controller())
        assert.equal('yflink yearn.finance test token', await vault.name())
        assert.equal('yflTEST', await vault.symbol())
        assert.equal(4, await vault.healthFactor())
    })

    it('accepts deposits and provides y token', async () => {
        await token.increaseAllowance(vault.address, 100, { from: user })
        await vault.deposit(100, { from: user })
        assert.equal(100, await vault.balanceOf(user))
        // first to deposit does not pay a fee
        assert.equal(0, await vault.insurance())
        assert.equal(100, await vault.balance())
        assert.equal(100, await vault.totalSupply())
    })

    it('only allows governance to call setHealthFactor', async () => {
        await expectRevert(
            vault.setHealthFactor(1, { from: deployer }),
            '!governance'
        )
        await vault.setHealthFactor(2, { from: governance })
        assert.equal(2, await vault.healthFactor())
    })

    it('only allows governance to call setGovernance', async () => {
        await expectRevert(
            vault.setGovernance(deployer, { from: deployer }),
            '!governance'
        )
        await vault.setGovernance(user, { from: governance })
        assert.equal(user, await vault.governance())
    })

    it('only allows governance to call setController', async () => {
        await expectRevert(
            vault.setController(deployer, { from: deployer }),
            '!governance'
        )
        await vault.setController(user, { from: governance })
        assert.equal(user, await vault.controller())
    })
})
