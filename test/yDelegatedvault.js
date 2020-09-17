const Aave = artifacts.require('MockAave')
const OneSplit = artifacts.require('MockOneSplit')
const Controller = artifacts.require('DelegatedController')
const Token = artifacts.require('Token')
const yDelegatedVault = artifacts.require('yDelegatedVault')
const { expectEvent, expectRevert } = require('@openzeppelin/test-helpers')

contract('yDelegatedVault', (accounts) => {
    const deployer = accounts[0]
    const governance = accounts[1]
    const rewards = accounts[2]
    const user = accounts[3]

    let onesplit_returnAmount = 1
    let onesplit_distribution = [1]

    let aave, controller, onesplit, token, vault

    beforeEach(async () => {
        token = await Token.new({ from: deployer })
        onesplit = await OneSplit.new(
            onesplit_returnAmount,
            onesplit_distribution,
            { from: deployer }
        )
        aave = await Aave.new({ from: deployer })
        controller = await Controller.new(
            rewards,
            onesplit.address,
            { from: deployer }
        )
        vault = await yDelegatedVault.new(
            token.address,
            controller.address,
            aave.address,
            { from: deployer }
        )
        await vault.setGovernance(
            governance,
            { from: deployer }
        )
    })

    it('has expected state on deployment', async () => {
        assert.equal(aave.address, await vault.aave())
        assert.equal(token.address, await vault.token())
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
