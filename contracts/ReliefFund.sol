// SPDX-License-Identifier: UNLICENSED
// Create a blockchain-based disaster relief smart contract
// Purpose: distribute emergency funds transparently
// Beneficiaries should be identified using:
// 1. Power outage duration
// 2. Electricity utilization drop
// No single signal should release funds
// Calculate an impact score from 0 to 100
// Release funds proportionally based on impact score
// Include roles: admin, auditor, beneficiary
// Include category-based spending:
// - Food
// - Medical
// - Shelter
// Make everything auditable on-chain
// start writing the smart contract
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";  
// Declare the ReliefFund smart contract




// Define roles for admin, auditor, and beneficiary

    // Define spending categories: Food, Medical, Shelter
contract ReliefFund is AccessControl, ReentrancyGuard {
    // Store beneficiary details including impact score based on power outage and electricity utilization

    
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    // Add function to calculate impact score using power outage hours and utilization drop
    bytes32 public constant AUDITOR_ROLE = keccak256("AUDITOR_ROLE");
        // define beneficiary role
        // define beneficiary struct with impact score and area information
    bytes32 public constant BENEFICIARY_ROLE = keccak256("BENEFICIARY_ROLE");
    // Add function to release funds proportionally based on impact score

    // Add function to allow beneficiaries to spend funds only within allowed categories
    // define enum for spending categories: Food, Medical, Shelter
    enum SpendingCategory { Food, Medical, Shelter }
    // Emit events for registration, impact calculation, fund release, and spending
    // add function to calculate impact score using power outage hours and utilization drop with weighted logic
    struct Beneficiary {
        uint256 impactScore;
        uint256 totalFunds;
        mapping(SpendingCategory => uint256) spentFunds;
        bool isRegistered;
    }
        // add function to release funds proportionally based on beneficiary impact score
    // Note: struct contains a nested mapping so we cannot expose the whole struct as `public`.
    mapping(address => Beneficiary) private beneficiaries;
        // add function to allow beneficiaries to spend funds only by category
    event BeneficiaryRegistered(address beneficiary);
        // declare events for audit trail
    event ImpactScoreCalculated(address beneficiary, uint256 impactScore);
    // end of contract
    event FundsReleased(address beneficiary, uint256 amount);
    event FundsSpent(address beneficiary, SpendingCategory category, uint256 amount);

    // --- Additional storage and events ---
    event FundsDeposited(address from, uint256 amount);

    // List of registered beneficiaries for iteration during payouts
    address[] private beneficiaryList;

    // Pool of undistributed funds (in wei)
    uint256 private poolBalance;

    // --- Constructor and admin setup ---
    // Grant deployer the DEFAULT_ADMIN_ROLE and ADMIN_ROLE
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
    }

    // --- Registration ---
    /// @notice Register a beneficiary (admin only)
    function registerBeneficiary(address _beneficiary) external onlyRole(ADMIN_ROLE) {
        require(_beneficiary != address(0), "Invalid beneficiary");
        Beneficiary storage b = beneficiaries[_beneficiary];
        require(!b.isRegistered, "Already registered");
        b.isRegistered = true;
        b.impactScore = 0;
        b.totalFunds = 0;
        beneficiaryList.push(_beneficiary);
        _grantRole(BENEFICIARY_ROLE, _beneficiary);
        emit BeneficiaryRegistered(_beneficiary);
    }

    // --- Impact scoring ---
    /// @notice Calculate and set impact score (0-100) by an auditor
    /// @dev Caps inputs at 100 and produces a weighted score: 60% outage, 40% utilization
    function calculateImpactScore(address _beneficiary, uint256 outageHours, uint256 utilizationDrop) external onlyRole(AUDITOR_ROLE) {
        Beneficiary storage b = beneficiaries[_beneficiary];
        require(b.isRegistered, "Not registered");

        uint256 outageNorm = outageHours > 100 ? 100 : outageHours;
        uint256 utilNorm = utilizationDrop > 100 ? 100 : utilizationDrop;

        uint256 score = (outageNorm * 60 + utilNorm * 40) / 100;
        if (score > 100) score = 100;
        b.impactScore = score;
        emit ImpactScoreCalculated(_beneficiary, score);
    }

    // --- Deposits & distribution ---
    /// @notice Deposit funds to the pool
    function depositFunds() external payable {
        require(msg.value > 0, "No funds");
        poolBalance += msg.value;
        emit FundsDeposited(msg.sender, msg.value);
    }

    /// @notice Release pool funds proportionally to registered beneficiaries based on impactScore
    /// @dev Uses integer math; impactScore is capped at 100 so multiplication by at most 100 is safe in practice.
    function releaseAllFunds() external onlyRole(ADMIN_ROLE) {
        require(poolBalance > 0, "No funds in pool");

        uint256 totalImpact = 0;
        for (uint256 i = 0; i < beneficiaryList.length; i++) {
            totalImpact += beneficiaries[beneficiaryList[i]].impactScore;
        }
        require(totalImpact > 0, "Total impact zero");

        // Safety check: avoid pathological overflow on extremely large poolBalance (practically impossible)
        require(poolBalance <= type(uint256).max / 100, "Pool too large");

        uint256 distributed;
        for (uint256 i = 0; i < beneficiaryList.length; i++) {
            address addr = beneficiaryList[i];
            Beneficiary storage b = beneficiaries[addr];
            if (!b.isRegistered || b.impactScore == 0) {
                continue;
            }

            // Calculate amount without losing precision: a = (poolBalance * score) / totalImpact
            uint256 amount = (poolBalance * b.impactScore) / totalImpact;
            if (amount == 0) continue;
            b.totalFunds += amount;
            distributed += amount;
            emit FundsReleased(addr, amount);
        }

        // Deduct distributed amount from poolBalance; leave any rounding residue in the pool
        if (distributed > 0) {
            poolBalance -= distributed;
        }
    }

    // --- Spending by category ---
    /// @notice Spend allocated funds in a specific category (beneficiary only)
    function spendFunds(SpendingCategory category, uint256 amount) external nonReentrant onlyRole(BENEFICIARY_ROLE) {
        require(amount > 0, "Amount must be > 0");
        Beneficiary storage b = beneficiaries[msg.sender];
        require(b.isRegistered, "Not registered");
        require(b.totalFunds >= amount, "Insufficient funds");

        // Enforce category-based accounting and limit
        b.spentFunds[category] += amount;
        b.totalFunds -= amount;
        emit FundsSpent(msg.sender, category, amount);

        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");
    }

    // --- View helpers ---
    function getImpactScore(address _beneficiary) external view returns (uint256) {
        return beneficiaries[_beneficiary].impactScore;
    }

    function getTotalFunds(address _beneficiary) external view returns (uint256) {
        return beneficiaries[_beneficiary].totalFunds;
    }

    function isBeneficiaryRegistered(address _beneficiary) external view returns (bool) {
        return beneficiaries[_beneficiary].isRegistered;
    }

    function getSpent(address _beneficiary, SpendingCategory category) external view returns (uint256) {
        return beneficiaries[_beneficiary].spentFunds[category];
    }

}
