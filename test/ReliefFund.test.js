const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ReliefFund", function () {
  let ReliefFund, relief, deployer, auditor, alice, bob, stranger;

  beforeEach(async function () {
    [deployer, auditor, alice, bob, stranger] = await ethers.getSigners();
    ReliefFund = await ethers.getContractFactory("ReliefFund");
    relief = await ReliefFund.connect(deployer).deploy();
    await relief.waitForDeployment();
  });

  it("assigns ADMIN_ROLE to deployer", async function () {
    const ADMIN_ROLE = await relief.ADMIN_ROLE();
    expect(await relief.hasRole(ADMIN_ROLE, deployer.address)).to.equal(true);
  });

  it("allows admin to grant AUDITOR_ROLE", async function () {
    const AUDITOR_ROLE = await relief.AUDITOR_ROLE();
    await relief.connect(deployer).grantRole(AUDITOR_ROLE, auditor.address);
    expect(await relief.hasRole(AUDITOR_ROLE, auditor.address)).to.equal(true);
  });

  it("registers beneficiaries (admin only)", async function () {
    await relief.connect(deployer).registerBeneficiary(alice.address);
    expect(await relief.isBeneficiaryRegistered(alice.address)).to.equal(true);
    const BENEFICIARY_ROLE = await relief.BENEFICIARY_ROLE();
    expect(await relief.hasRole(BENEFICIARY_ROLE, alice.address)).to.equal(true);
  });

  it("only auditor can calculate impact score and calculation is correct", async function () {
    const AUDITOR_ROLE = await relief.AUDITOR_ROLE();
    await relief.connect(deployer).grantRole(AUDITOR_ROLE, auditor.address);
    await relief.connect(deployer).registerBeneficiary(alice.address);

    await expect(
      relief.connect(stranger).calculateImpactScore(alice.address, 50, 50)
    ).to.be.reverted;

    await relief.connect(auditor).calculateImpactScore(alice.address, 50, 50);
    expect(await relief.getImpactScore(alice.address)).to.equal(50);
  });

  it("releases funds proportionally based on impact scores", async function () {
    await relief.connect(deployer).grantRole(await relief.AUDITOR_ROLE(), auditor.address);
    await relief.connect(deployer).registerBeneficiary(alice.address);
    await relief.connect(deployer).registerBeneficiary(bob.address);

    await relief.connect(auditor).calculateImpactScore(alice.address, 80, 0);
    await relief.connect(auditor).calculateImpactScore(bob.address, 20, 0);

    const deposit = ethers.parseEther("10");
    await relief.connect(stranger).depositFunds({ value: deposit });

    await relief.connect(deployer).releaseAllFunds();

    const aliceFunds = await relief.getTotalFunds(alice.address);
    const bobFunds = await relief.getTotalFunds(bob.address);

    expect(aliceFunds).to.equal(ethers.parseEther("8"));
    expect(bobFunds).to.equal(ethers.parseEther("2"));
  });

  it("enforces category-based spending and limits", async function () {
    await relief.connect(deployer).grantRole(await relief.AUDITOR_ROLE(), auditor.address);
    await relief.connect(deployer).registerBeneficiary(alice.address);
    await relief.connect(auditor).calculateImpactScore(alice.address, 100, 100);

    const deposit = ethers.parseEther("5");
    await relief.connect(stranger).depositFunds({ value: deposit });
    await relief.connect(deployer).releaseAllFunds();

    const before = await relief.getTotalFunds(alice.address);
    expect(before).to.equal(deposit);

    await relief.connect(alice).spendFunds(0, ethers.parseEther("1"));
    expect(await relief.getTotalFunds(alice.address)).to.equal(ethers.parseEther("4"));
    expect(await relief.getSpent(alice.address, 0)).to.equal(ethers.parseEther("1"));

    await expect(
      relief.connect(alice).spendFunds(1, ethers.parseEther("10"))
    ).to.be.revertedWith("Insufficient funds");

    await expect(
      relief.connect(stranger).spendFunds(0, ethers.parseEther("1"))
    ).to.be.reverted;
  });
});
