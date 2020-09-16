const Aave = artifacts.require('MockAave')
const Controller = artifacts.require('Controller')
const Token = artifacts.require('Token')
const yDelegatedVault = artifacts.require('yDelegatedVault')

contract('yDelegatedVault', (accounts) => {
    const deployer = accounts[0]
    const governance = accounts[1]
    const rewards = accounts[2]
    const user = accounts[3]

    let aave, controller, token, vault

    beforeEach(async () => {
        token = await Token.new({ from: deployer })
        aave = await Aave.new({ from: deployer })
        controller = await Controller.new(
            rewards,
            { from: deployer }
        )
        vault = await yDelegatedVault.new(
            token.address,
            controller.address,
            aave.address,
            { from: deployer }
        )
    })

    it('has expected state on deployment', async () => {
        assert.equal(aave.address, await vault.aave())
        assert.equal(token.address, await vault.token())
    })
})
