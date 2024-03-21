// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.7;

// WETH9-style mock. Deployed via vm.etch at the hardcoded Arbitrum WETH
// address, so it must not rely on constructor-initialized storage.
contract WETHMock {
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Deposit(address indexed dst, uint256 wad);
    event Withdrawal(address indexed src, uint256 wad);
    event Transfer(address indexed src, address indexed dst, uint256 wad);

    receive() external payable {
        deposit();
    }

    function name() external pure returns (string memory) {
        return "Wrapped Ether";
    }

    function symbol() external pure returns (string memory) {
        return "WETH";
    }

    function decimals() external pure returns (uint8) {
        return 18;
    }

    function deposit() public payable {
        balanceOf[msg.sender] += msg.value;
        emit Deposit(msg.sender, msg.value);
    }

    function withdraw(uint256 wad) external {
        require(balanceOf[msg.sender] >= wad, "WETH: insufficient");
        balanceOf[msg.sender] -= wad;
        // use call: account proxies need more than a 2300 gas stipend to receive ETH
        (bool ok, ) = payable(msg.sender).call{value: wad}("");
        require(ok, "WETH: send failed");
        emit Withdrawal(msg.sender, wad);
    }

    function totalSupply() external view returns (uint256) {
        return address(this).balance;
    }

    function approve(address guy, uint256 wad) external returns (bool) {
        allowance[msg.sender][guy] = wad;
        return true;
    }

    function transfer(address dst, uint256 wad) external returns (bool) {
        return transferFrom(msg.sender, dst, wad);
    }

    function transferFrom(
        address src,
        address dst,
        uint256 wad
    ) public returns (bool) {
        require(balanceOf[src] >= wad, "WETH: insufficient");

        if (src != msg.sender && allowance[src][msg.sender] != type(uint256).max) {
            require(allowance[src][msg.sender] >= wad, "WETH: allowance");
            allowance[src][msg.sender] -= wad;
        }

        balanceOf[src] -= wad;
        balanceOf[dst] += wad;
        emit Transfer(src, dst, wad);
        return true;
    }
}
