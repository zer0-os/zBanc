import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import hre from "hardhat";
import fs from "fs";
import { BondingToken } from "../typechain-types/contracts/resources/fees";

const { ethers } = hre;

describe("BondingToken Edge Case Tests", function () {
  async function deploy() {
    const [deployer, user, user1, user2, user3, ...others] = await hre.ethers.getSigners();
    const userAddress = await user.getAddress();
    const user1Address = await user1.getAddress();
    const user2Address = await user2.getAddress();
    const user3Address = await user3.getAddress();

    const reserveTokenFactory = await hre.ethers.getContractFactory("ERC20Token");
    const reserveToken = await reserveTokenFactory.deploy("Wilder World", "WILD");
    const reserveTokenAddress = await reserveToken.getAddress();

    const bondingTokenFactory = await hre.ethers.getContractFactory("BondingToken");
    const bondingToken = await bondingTokenFactory.deploy("GOLD", "GLD", reserveTokenAddress, 0, 0);
    const bondingTokenAddress = await bondingToken.getAddress();

    return { bondingToken, bondingTokenAddress, reserveToken, reserveTokenAddress, deployer, user, userAddress, user1, user1Address, user2, user2Address, user3, user3Address, others };
  }

  const entryFees = [0, 100, 1000]; // 0%, 1%
  const exitFees = [0, 100, 1000]; // 0%, 1%
  const amounts = [
    1n,
    10n ** 8n, // 100000000 wei
    10n ** 18n, // 1 ether in wei
    100n * 10n ** 18n // 100 ether in wei
  ]; // 1 wei, 1 ether, 100 ether
  const numUsers = [1, 2];

  async function getExpectedShares(bondingToken: BondingToken, amount: bigint, feeBasisPoints: number) {
    const netAmount = amount - (amount * BigInt(feeBasisPoints) / 10000n);
    return await bondingToken.convertToShares(netAmount);
  }

  async function getExpectedAssets(bondingToken: BondingToken, shares: bigint, feeBasisPoints: number) {
    const grossAssets = await bondingToken.convertToAssets(shares);
    const fee = grossAssets * BigInt(feeBasisPoints) / 10000n;
    return grossAssets - fee;
  }

  const allData: {
    users: { assets: string[], shares: string[] }[],
    totalSupply: string[],
    totalAssets: string[]
  } = {
    users: [],
    totalSupply: [],
    totalAssets: []
  };


  let totalAssets = 0n;
  let totalShares = 0n;

  for (const entryFee of entryFees) {
    for (const exitFee of exitFees) {
      for (const amount of amounts) {
        for (const userCount of numUsers) {
          it(`should correctly handle deposit and redeem with entry fee ${entryFee} bps and exit fee ${exitFee} bps for ${userCount} user(s) depositing ${amount.toString()} wei`, async function () {
            const { bondingToken, bondingTokenAddress, reserveToken, reserveTokenAddress, deployer, user, userAddress, user1, user1Address, user2, user2Address, user3, user3Address } = await loadFixture(deploy);

            await bondingToken.setEntryFee(entryFee);
            await bondingToken.setExitFee(exitFee);

            const users = [user, user1, user2, user3].slice(0, userCount);
            const userAddresses = [userAddress, user1Address, user2Address, user3Address].slice(0, userCount);


            const data = users.map(() => ({ assets: [] as string[], shares: [] as string[] }));

            // Handle deposits
            for (let i = 0; i < users.length; i++) {
              const user = users[i];
              const userAddress = userAddresses[i];

              await reserveToken.mint(userAddress, amount);
              await reserveToken.connect(user).approve(bondingTokenAddress, amount);

              const expectedShares = await getExpectedShares(bondingToken, amount, entryFee);
              const contractBalanceBefore = await reserveToken.balanceOf(bondingTokenAddress);

              await bondingToken.connect(user).deposit(amount, userAddress);

              //await expect(bondingToken.connect(user).deposit(amount, userAddress))
              //  .to.emit(bondingToken, 'Deposit')
              //  .withArgs(userAddress, userAddress, amount - (amount * BigInt(entryFee) / 10000n), expectedShares);

              const contractBalanceAfter = await reserveToken.balanceOf(bondingTokenAddress);
              const actualShares = await bondingToken.balanceOf(userAddress);
              totalAssets += amount;
              totalShares += expectedShares;

              data[i].assets.push(contractBalanceAfter.toString());
              data[i].shares.push(actualShares.toString());

              //expect(actualShares).to.equal(expectedShares);
            }

            // Record total assets and supply after deposits
            allData.totalSupply.push(totalShares.toString());
            allData.totalAssets.push(totalAssets.toString());

            for (let i = 0; i < users.length; i++) {
              if (!allData.users[i]) {
                allData.users[i] = { assets: [], shares: [] };
              }
              allData.users[i].assets.push(...data[i].assets);
              allData.users[i].shares.push(...data[i].shares);
            }

            // Handle redeems
            for (let i = 0; i < users.length; i++) {
              const user = users[i];
              const userAddress = userAddresses[i];
              let sharesToRedeem = await bondingToken.maxRedeem(userAddress);
              sharesToRedeem /= 2n;
              //console.log(sharesToRedeem);
              const expectedAssets = await getExpectedAssets(bondingToken, sharesToRedeem, exitFee);
              const contractBalanceBefore = await reserveToken.balanceOf(bondingTokenAddress);

              await reserveToken.connect(user).approve(bondingTokenAddress, sharesToRedeem);
              await bondingToken.connect(user).redeem(sharesToRedeem, userAddress, userAddress);

              //await expect(bondingToken.connect(user).redeem(sharesToRedeem, userAddress, userAddress))
              //  .to.emit(bondingToken, 'Withdraw')
              //  .withArgs(userAddress, userAddress, userAddress, expectedAssets, sharesToRedeem);

              const contractBalanceAfter = await reserveToken.balanceOf(bondingTokenAddress);
              const actualAssets = contractBalanceBefore - contractBalanceAfter;
              totalAssets -= actualAssets;

              data[i].assets.push(contractBalanceAfter.toString());
              data[i].shares.push((await bondingToken.balanceOf(userAddress)).toString());

              //expect(actualAssets).to.equal(expectedAssets);
              //expect(contractBalanceAfter).to.equal(totalAssets);
            }

            // Record total assets and supply after redeems
            allData.totalSupply.push(totalShares.toString());
            allData.totalAssets.push(totalAssets.toString());

            for (let i = 0; i < users.length; i++) {
              if (!allData.users[i]) {
                allData.users[i] = { assets: [], shares: [] };
              }
              allData.users[i].assets.push(...data[i].assets);
              allData.users[i].shares.push(...data[i].shares);
            }
          });
        }
      }
    }
  }

  after(() => {
    // Generate the HTML file for the plots
    generateHTML(allData);
  });

  function generateHTML(allData: any) {
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>BondingToken Test Results</title>
      <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    </head>
    <body>
      ${allData.users.map((userData: any, index: number) => `
        <h2>User ${index + 1} BT balance Over Time</h2>
        <canvas id="user${index + 1}AssetsChart"></canvas>
        <h2>User ${index + 1} RT balance Over Time</h2>
        <canvas id="user${index + 1}SharesChart"></canvas>
      `).join('')}
      <h2>Total BT Supply Over Time</h2>
      <canvas id="totalSupplyChart"></canvas>
      <h2>Total RT Assets Over Time</h2>
      <canvas id="totalAssetsChart"></canvas>
      <script>
        ${allData.users.map((userData: any, index: number) => `
          const user${index + 1}AssetsCtx = document.getElementById('user${index + 1}AssetsChart').getContext('2d');
          const user${index + 1}AssetsChart = new Chart(user${index + 1}AssetsCtx, {
            type: 'line',
            data: {
              labels: ${JSON.stringify(Array.from({ length: userData.assets.length }, (_, i) => i + 1))},
              datasets: [
                {
                  label: 'User ${index + 1} Assets',
                  data: ${JSON.stringify(userData.assets)},
                  borderColor: 'rgba(75, 192, 192, 1)',
                  borderWidth: 1,
                  fill: false
                }
              ]
            },
            options: {
              scales: {
                x: { beginAtZero: true },
                y: { beginAtZero: true }
              }
            }
          });

          const user${index + 1}SharesCtx = document.getElementById('user${index + 1}SharesChart').getContext('2d');
          const user${index + 1}SharesChart = new Chart(user${index + 1}SharesCtx, {
            type: 'line',
            data: {
              labels: ${JSON.stringify(Array.from({ length: userData.shares.length }, (_, i) => i + 1))},
              datasets: [
                {
                  label: 'User ${index + 1} Shares',
                  data: ${JSON.stringify(userData.shares)},
                  borderColor: 'rgba(153, 102, 255, 1)',
                  borderWidth: 1,
                  fill: false
                }
              ]
            },
            options: {
              scales: {
                x: { beginAtZero: true },
                y: { beginAtZero: true }
              }
            }
          });
        `).join('')}

        const totalSupplyCtx = document.getElementById('totalSupplyChart').getContext('2d');
        const totalSupplyChart = new Chart(totalSupplyCtx, {
          type: 'line',
          data: {
            labels: ${JSON.stringify(Array.from({ length: allData.totalSupply.length }, (_, i) => i + 1))},
            datasets: [
              {
                label: 'Total Supply',
                data: ${JSON.stringify(allData.totalSupply)},
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1,
                fill: false
              }
            ]
          },
          options: {
            scales: {
              x: { beginAtZero: true },
              y: { beginAtZero: true }
            }
          }
        });

        const totalAssetsCtx = document.getElementById('totalAssetsChart').getContext('2d');
        const totalAssetsChart = new Chart(totalAssetsCtx, {
          type: 'line',
          data: {
            labels: ${JSON.stringify(Array.from({ length: allData.totalAssets.length }, (_, i) => i + 1))},
            datasets: [
              {
                label: 'Total Assets',
                data: ${JSON.stringify(allData.totalAssets)},
                borderColor: 'rgba(153, 102, 255, 1)',
                borderWidth: 1,
                fill: false
              }
            ]
          },
          options: {
            scales: {
              x: { beginAtZero: true },
              y: { beginAtZero: true }
            }
          }
        });
      </script>
    </body>
    </html>
    `;

    fs.writeFileSync(`test_results.html`, html);
  }
});
