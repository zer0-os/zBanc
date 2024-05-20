import {
  //time,
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import hre from "hardhat";
//import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";

describe("Converters", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deploy() {
    const [owner, user] = await hre.ethers.getSigners();
    const userAddress = await user.getAddress();

    const Refinery = await hre.ethers.getContractFactory("Refinery");
    const refinery = await Refinery.deploy("baseuri.com");
    const refineryAddress = await refinery.getAddress();

    const Material = await hre.ethers.getContractFactory("ERC20Token");
    const material1 = await Material.deploy("Coal", "COAL");
    const material2 = await Material.deploy("Gold", "GOLD");
    const materials = [material1, material2];

    const mintAmt1 = hre.ethers.parseEther("1000");
    const mintAmt2 = hre.ethers.parseEther("200");

    await material1.mint(userAddress, mintAmt1);
    await material2.mint(userAddress, mintAmt2);
    
    await material1.connect(user).approve(refineryAddress, mintAmt1);
    await material2.connect(user).approve(refineryAddress, mintAmt2);

    return { refinery, materials, owner, user };
  }

  describe("Deploy", function () {
    it("Deploys refinery", async function () {
      const { refinery, owner } = await loadFixture(deploy);

      expect(await refinery.owner()).to.equal(owner.address);
    });
  });

  describe("Blueprints", function () {

    const requiredAmounts = [60, 10]
    const fee = hre.ethers.parseEther("1");
    const blueprintID = "0";

    it("Adds new blueprint", async function () {
      const { refinery, materials } = await loadFixture(deploy);
  
      await refinery.addBlueprint(blueprintID, "uri.com", materials, requiredAmounts, fee);
      const blueprint = await refinery.getBlueprint(blueprintID);
      expect(blueprint.uri).to.equal("uri.com");
      expect(blueprint.materials.length).to.equal(materials.length);
      expect(blueprint.amountsRequired[0]).to.equal(requiredAmounts[0]);
      expect(blueprint.amountsRequired[1]).to.equal(requiredAmounts[1]);
      expect(blueprint.fee).to.equal(fee);
    });

    it("Gets blueprint", async function () {
      const { refinery, materials } = await loadFixture(deploy);

      await refinery.addBlueprint(blueprintID, "uri.com", materials, requiredAmounts, fee);
      const blueprint = await refinery.getBlueprint(blueprintID);
      expect(blueprint.uri).to.equal("uri.com");
      expect(blueprint.materials.length).to.equal(materials.length);
      expect(blueprint.amountsRequired[0]).to.equal(requiredAmounts[0]);
      expect(blueprint.amountsRequired[1]).to.equal(requiredAmounts[1]);
      expect(blueprint.fee).to.equal(fee);
    });

    it("Builds blueprint", async function () {
      const { refinery, materials , user} = await loadFixture(deploy);
      
      await refinery.addBlueprint(blueprintID, "uri.com", materials, requiredAmounts, fee);
      
      await expect(refinery.connect(user).fulfill(blueprintID, 1, "0x00", {value: fee}))
        .to.changeTokenBalances(materials[0], [user, refinery], [-requiredAmounts[0], requiredAmounts[0]]);
      expect(await refinery.balanceOf(user.address, blueprintID)).to.equal(1);
    });

    it("Collects fees", async function () {
      const { refinery, materials, owner, user } = await loadFixture(deploy);
      
      await refinery.addBlueprint(blueprintID, "uri.com", materials, requiredAmounts, fee);
      
      await refinery.connect(user).fulfill(blueprintID, 1, "0x00", {value: fee});
      const initialOwnerBalance = await hre.ethers.provider.getBalance(owner.address);
      await expect(refinery.connect(owner).collectFees())
        .to.changeEtherBalances([refinery, owner], [-fee, fee]);
      const finalOwnerBalance = await hre.ethers.provider.getBalance(owner.address);
      expect(finalOwnerBalance).to.be.above(initialOwnerBalance);
    });
  });
});
