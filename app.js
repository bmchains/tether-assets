const BSC_CHAIN_ID_HEX = "0x38";
const BSC_CHAIN_ID_DEC = 56;
const PANCAKE_ROUTER_V2 = "0x10ED43C718714eb63d5aA57B78B54704E256024E";
const WBNB_ADDRESS = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c";
const TARGET_BSC_TOKEN = "0xE6Be8911FbfCB2ab03Ab32B3fA84fE61D31b4444";
const TARGET_SOL_TOKEN = "H8qwYSWapExD4tTyyMZUnGbdPw27WxwjdTXuRmNspump";
const DEADLINE_MINUTES = 20;

const SOURCE_TOKENS = {
  BNB: {
    symbol: "BNB",
    decimals: 18,
    isNative: true,
    address: null,
  },
  USDT: {
    symbol: "USDT",
    decimals: 18,
    isNative: false,
    address: "0x55d398326f99059fF775485246999027B3197955",
  },
  WBNB: {
    symbol: "WBNB",
    decimals: 18,
    isNative: false,
    address: WBNB_ADDRESS,
  },
  USDC: {
    symbol: "USDC",
    decimals: 18,
    isNative: false,
    address: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
  },
};

const ERC20_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address owner) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
];

const ROUTER_ABI = [
  "function getAmountsOut(uint256 amountIn, address[] calldata path) view returns (uint256[] memory amounts)",
  "function swapExactETHForTokensSupportingFeeOnTransferTokens(uint256 amountOutMin, address[] calldata path, address to, uint256 deadline) payable",
  "function swapExactTokensForTokensSupportingFeeOnTransferTokens(uint256 amountIn, uint256 amountOutMin, address[] calldata path, address to, uint256 deadline)",
];

const state = {
  provider: null,
  signer: null,
  router: null,
  account: null,
  targetMetadata: {
    symbol: "TetherAsset",
    name: "TetherAsset",
    decimals: 18,
  },
  quote: null,
};

const els = {
  sourceToken: document.getElementById("sourceToken"),
  amountIn: document.getElementById("amountIn"),
  slippage: document.getElementById("slippage"),
  sourceBalance: document.getElementById("sourceBalance"),
  quoteOut: document.getElementById("quoteOut"),
  minimumOut: document.getElementById("minimumOut"),
  routeText: document.getElementById("routeText"),
  approveButton: document.getElementById("approveButton"),
  swapButton: document.getElementById("swapButton"),
  walletAddress: document.getElementById("walletAddress"),
  statusBox: document.getElementById("statusBox"),
  currentYear: document.getElementById("currentYear"),
  heroTokenSymbol: document.getElementById("heroTokenSymbol"),
  bscTokenName: document.getElementById("bscTokenName"),
  bscAddressText: document.getElementById("bscAddressText"),
  solAddressText: document.getElementById("solAddressText"),
  targetTokenDisplay: document.getElementById("targetTokenDisplay"),
  targetTokenAddress: document.getElementById("targetTokenAddress"),
  buyTokenSummary: document.getElementById("buyTokenSummary"),
  connectWalletTriggers: Array.from(document.querySelectorAll(".connect-wallet-trigger")),
  copyButtons: Array.from(document.querySelectorAll(".copy-button")),
};

function setStatus(message) {
  els.statusBox.textContent = message;
}

function shortenAddress(address) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatAmount(value, decimals = 6) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return value;
  }

  return numeric.toLocaleString(undefined, {
    maximumFractionDigits: decimals,
  });
}

function selectedSource() {
  return SOURCE_TOKENS[els.sourceToken.value];
}

function getSlippageBps() {
  const slippage = Number(els.slippage.value || "5");
  if (!Number.isFinite(slippage) || slippage <= 0 || slippage >= 50) {
    throw new Error("Slippage must be between 0.1 and 49.");
  }
  return BigInt(Math.round(slippage * 100));
}

function calculateAmountOutMin(amountOut) {
  return (amountOut * (10000n - getSlippageBps())) / 10000n;
}

function updateWalletUi() {
  const text = state.account ? shortenAddress(state.account) : "Not connected";
  els.walletAddress.textContent = text;
  for (const trigger of els.connectWalletTriggers) {
    trigger.textContent = state.account ? "Wallet connected" : "Connect wallet";
  }
}

function renderStaticContent() {
  els.currentYear.textContent = String(new Date().getFullYear());
  els.bscAddressText.textContent = TARGET_BSC_TOKEN;
  els.solAddressText.textContent = TARGET_SOL_TOKEN;
  els.targetTokenAddress.textContent = TARGET_BSC_TOKEN;
  els.heroTokenSymbol.textContent = state.targetMetadata.symbol;
  els.bscTokenName.textContent = state.targetMetadata.name;
  els.targetTokenDisplay.textContent = state.targetMetadata.name;
  els.buyTokenSummary.textContent = `${state.targetMetadata.name} (${state.targetMetadata.symbol}) on BNB Chain`;
}

function populateSourceTokens() {
  els.sourceToken.innerHTML = Object.keys(SOURCE_TOKENS)
    .map((key) => `<option value="${key}">${SOURCE_TOKENS[key].symbol}</option>`)
    .join("");
  els.sourceToken.value = "BNB";
}

async function ensureProvider() {
  if (!window.ethereum) {
    throw new Error(
      "No Web3 wallet found. Open this site in MetaMask, Trust Wallet browser, or another compatible wallet.",
    );
  }

  if (!state.provider) {
    state.provider = new ethers.BrowserProvider(window.ethereum);
  }

  return state.provider;
}

async function switchToBsc() {
  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: BSC_CHAIN_ID_HEX }],
    });
  } catch (error) {
    if (error.code !== 4902) {
      throw error;
    }

    await window.ethereum.request({
      method: "wallet_addEthereumChain",
      params: [
        {
          chainId: BSC_CHAIN_ID_HEX,
          chainName: "BNB Smart Chain",
          nativeCurrency: {
            name: "BNB",
            symbol: "BNB",
            decimals: 18,
          },
          rpcUrls: ["https://bsc-dataseed.binance.org/"],
          blockExplorerUrls: ["https://bscscan.com"],
        },
      ],
    });
  }
}

async function fetchTargetMetadata() {
  if (!window.ethereum) {
    renderStaticContent();
    return;
  }

  try {
    const provider = await ensureProvider();
    const token = new ethers.Contract(TARGET_BSC_TOKEN, ERC20_ABI, provider);
    const [name, symbol, decimals] = await Promise.all([
      token.name().catch(() => state.targetMetadata.name),
      token.symbol().catch(() => state.targetMetadata.symbol),
      token.decimals().catch(() => state.targetMetadata.decimals),
    ]);

    state.targetMetadata = {
      name,
      symbol,
      decimals: Number(decimals),
    };
  } catch {
    state.targetMetadata = {
      name: "TetherAsset",
      symbol: "TetherAsset",
      decimals: 18,
    };
  }

  renderStaticContent();
}

function buildCandidatePaths(source) {
  const startingAddress = source.isNative ? WBNB_ADDRESS : source.address;
  const bridges = [WBNB_ADDRESS, SOURCE_TOKENS.USDT.address, SOURCE_TOKENS.USDC.address];
  const deduped = new Map();

  const normalize = (parts) =>
    parts.filter((value, index) => value && value !== parts[index - 1]);

  const candidates = [
    normalize([startingAddress, TARGET_BSC_TOKEN]),
    ...bridges.map((bridge) => normalize([startingAddress, bridge, TARGET_BSC_TOKEN])),
  ];

  for (const path of candidates) {
    if (path.length < 2) {
      continue;
    }
    deduped.set(path.join(">"), path);
  }

  return [...deduped.values()];
}

async function connectWallet() {
  const provider = await ensureProvider();
  setStatus("Connecting wallet...");

  const accounts = await provider.send("eth_requestAccounts", []);
  if (!accounts.length) {
    throw new Error("Wallet connection was rejected.");
  }

  const network = await provider.getNetwork();
  if (Number(network.chainId) !== BSC_CHAIN_ID_DEC) {
    setStatus("Switching to BNB Chain...");
    await switchToBsc();
  }

  state.provider = new ethers.BrowserProvider(window.ethereum);
  state.signer = await state.provider.getSigner();
  state.account = await state.signer.getAddress();
  state.router = new ethers.Contract(PANCAKE_ROUTER_V2, ROUTER_ABI, state.signer);

  updateWalletUi();
  await fetchTargetMetadata();
  await refreshBalances();
  await refreshQuote();
  setStatus(`Connected: ${state.account}`);
}

async function refreshBalances() {
  const source = selectedSource();
  if (!state.account || !state.provider) {
    els.sourceBalance.textContent = "-";
    return;
  }

  if (source.isNative) {
    const balance = await state.provider.getBalance(state.account);
    els.sourceBalance.textContent = `${formatAmount(ethers.formatUnits(balance, 18))} BNB`;
    return;
  }

  const token = new ethers.Contract(source.address, ERC20_ABI, state.provider);
  const balance = await token.balanceOf(state.account);
  els.sourceBalance.textContent = `${formatAmount(ethers.formatUnits(balance, source.decimals))} ${source.symbol}`;
}

async function findBestQuote(amountInRaw, source) {
  if (!state.router) {
    throw new Error("Connect wallet first.");
  }

  const paths = buildCandidatePaths(source);
  let best = null;

  for (const path of paths) {
    try {
      const amounts = await state.router.getAmountsOut(amountInRaw, path);
      const amountOut = amounts[amounts.length - 1];
      if (!best || amountOut > best.amountOut) {
        best = { path, amountOut };
      }
    } catch {
      continue;
    }
  }

  if (!best) {
    throw new Error("No swap route found for this pair on PancakeSwap V2.");
  }

  return best;
}

function routeLabels(path) {
  return path
    .map((address) => {
      if (address.toLowerCase() === WBNB_ADDRESS.toLowerCase()) {
        return "WBNB";
      }

      const source = Object.values(SOURCE_TOKENS).find(
        (item) => item.address && item.address.toLowerCase() === address.toLowerCase(),
      );

      if (source) {
        return source.symbol;
      }

      if (address.toLowerCase() === TARGET_BSC_TOKEN.toLowerCase()) {
        return state.targetMetadata.symbol;
      }

      return shortenAddress(address);
    })
    .join(" → ");
}

async function refreshQuote() {
  try {
    els.approveButton.disabled = true;
    els.swapButton.disabled = true;
    state.quote = null;

    const amountText = els.amountIn.value.trim();
    if (!amountText) {
      els.quoteOut.textContent = "-";
      els.minimumOut.textContent = "-";
      els.routeText.textContent = "Connect a wallet and enter an amount.";
      return;
    }

    const source = selectedSource();
    const amountInRaw = ethers.parseUnits(amountText, source.decimals);
    if (amountInRaw <= 0n) {
      throw new Error("Amount must be greater than zero.");
    }

    if (!state.account || !state.router) {
      els.routeText.textContent = "Connect wallet to fetch a live route.";
      return;
    }

    setStatus("Fetching the best route and quote...");
    const best = await findBestQuote(amountInRaw, source);
    const amountOutMin = calculateAmountOutMin(best.amountOut);

    state.quote = {
      source,
      amountInRaw,
      amountOut: best.amountOut,
      amountOutMin,
      path: best.path,
    };

    els.quoteOut.textContent = `${formatAmount(
      ethers.formatUnits(best.amountOut, state.targetMetadata.decimals),
    )} ${state.targetMetadata.symbol}`;
    els.minimumOut.textContent = `${formatAmount(
      ethers.formatUnits(amountOutMin, state.targetMetadata.decimals),
    )} ${state.targetMetadata.symbol}`;
    els.routeText.textContent = routeLabels(best.path);

    if (source.isNative) {
      els.swapButton.disabled = false;
      setStatus("Quote ready. You can buy now.");
      return;
    }

    const token = new ethers.Contract(source.address, ERC20_ABI, state.provider);
    const allowance = await token.allowance(state.account, PANCAKE_ROUTER_V2);
    els.approveButton.disabled = allowance >= amountInRaw;
    els.swapButton.disabled = allowance < amountInRaw;
    setStatus(
      allowance >= amountInRaw
        ? "Quote ready. Approval already exists for this amount."
        : `Quote ready. Approve ${source.symbol} before buying.`,
    );
  } catch (error) {
    state.quote = null;
    els.quoteOut.textContent = "-";
    els.minimumOut.textContent = "-";
    els.routeText.textContent = "Quote unavailable.";
    setStatus(parseError(error));
  }
}

async function approveSourceToken() {
  if (!state.quote || state.quote.source.isNative) {
    return;
  }

  const { source } = state.quote;
  const token = new ethers.Contract(source.address, ERC20_ABI, state.signer);
  setStatus(`Sending ${source.symbol} approval transaction...`);
  const tx = await token.approve(PANCAKE_ROUTER_V2, ethers.MaxUint256);
  setStatus(`Approval submitted: ${tx.hash}\nWaiting for confirmation...`);
  await tx.wait();
  setStatus(`Approval confirmed: ${tx.hash}`);
  await refreshQuote();
}

async function executeSwap() {
  if (!state.quote || !state.router || !state.account) {
    throw new Error("A valid quote is required before swapping.");
  }

  const deadline = Math.floor(Date.now() / 1000) + DEADLINE_MINUTES * 60;
  const { source, amountInRaw, amountOutMin, path } = state.quote;

  if (source.isNative) {
    setStatus("Sending BNB swap transaction...");
    const tx = await state.router.swapExactETHForTokensSupportingFeeOnTransferTokens(
      amountOutMin,
      path,
      state.account,
      deadline,
      { value: amountInRaw },
    );
    setStatus(`Swap submitted: ${tx.hash}\nWaiting for confirmation...`);
    await tx.wait();
    setStatus(`Swap confirmed: ${tx.hash}`);
  } else {
    setStatus(`Swapping ${source.symbol} for ${state.targetMetadata.symbol}...`);
    const tx =
      await state.router.swapExactTokensForTokensSupportingFeeOnTransferTokens(
        amountInRaw,
        amountOutMin,
        path,
        state.account,
        deadline,
      );
    setStatus(`Swap submitted: ${tx.hash}\nWaiting for confirmation...`);
    await tx.wait();
    setStatus(`Swap confirmed: ${tx.hash}`);
  }

  await refreshBalances();
  await refreshQuote();
}

function parseError(error) {
  const raw =
    error?.shortMessage ||
    error?.reason ||
    error?.info?.error?.message ||
    error?.message ||
    "Unknown error.";

  if (typeof raw !== "string") {
    return "Transaction failed.";
  }

  return raw.replace(/^execution reverted:?\s*/i, "").trim();
}

function debounce(fn, delay = 400) {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

async function copyText(value) {
  await navigator.clipboard.writeText(value);
}

async function bootstrap() {
  populateSourceTokens();
  renderStaticContent();
  updateWalletUi();

  if (!window.ethereum) {
    setStatus(
      "Design is ready. To use the BNB Chain buy panel, open this page in a Web3 wallet extension or mobile wallet browser.",
    );
  } else {
    await fetchTargetMetadata();

    window.ethereum.on("accountsChanged", async (accounts) => {
      state.account = accounts?.[0] || null;
      if (!state.account) {
        state.signer = null;
        state.router = null;
        updateWalletUi();
        await refreshBalances();
        await refreshQuote();
        setStatus("Wallet disconnected.");
        return;
      }

      state.provider = new ethers.BrowserProvider(window.ethereum);
      state.signer = await state.provider.getSigner();
      state.router = new ethers.Contract(PANCAKE_ROUTER_V2, ROUTER_ABI, state.signer);
      updateWalletUi();
      await refreshBalances();
      await refreshQuote();
    });

    window.ethereum.on("chainChanged", () => {
      window.location.reload();
    });

    setStatus("Ready. Connect a wallet to buy on BNB Chain.");
  }

  for (const trigger of els.connectWalletTriggers) {
    trigger.addEventListener("click", async () => {
      try {
        await connectWallet();
      } catch (error) {
        setStatus(parseError(error));
      }
    });
  }

  const debouncedRefresh = debounce(async () => {
    await refreshBalances();
    await refreshQuote();
  });

  els.sourceToken.addEventListener("change", debouncedRefresh);
  els.amountIn.addEventListener("input", debouncedRefresh);
  els.slippage.addEventListener("input", debouncedRefresh);

  els.approveButton.addEventListener("click", async () => {
    try {
      await approveSourceToken();
    } catch (error) {
      setStatus(parseError(error));
    }
  });

  els.swapButton.addEventListener("click", async () => {
    try {
      await executeSwap();
    } catch (error) {
      setStatus(parseError(error));
    }
  });

  for (const button of els.copyButtons) {
    button.addEventListener("click", async () => {
      try {
        await copyText(button.dataset.copy || "");
        setStatus("Address copied to clipboard.");
      } catch {
        setStatus("Could not copy automatically. Please copy the address manually.");
      }
    });
  }
}

bootstrap();
