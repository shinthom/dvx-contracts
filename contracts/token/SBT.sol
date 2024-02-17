// SPDX-License-Identifier: MIT
pragma solidity 0.8.7;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract SBT is ERC1155, Ownable {
    using Strings for uint256;

    string private baseURI;
    mapping(address => mapping(uint256 => bool)) private _whitelist;
    mapping(address => mapping(uint256 => bool)) private _claimed;

    event WhitelistAdded(address[] accounts);
    event Claimed(address indexed account, uint256 id, uint256 amount);

    constructor() ERC1155("") {}

    function whitelist(
        address account,
        uint256 id
    ) external view returns (bool) {
        return _whitelist[account][id];
    }

    function claimed(address account, uint256 id) external view returns (bool) {
        return _claimed[account][id];
    }

    function addWhitelist(
        address[] calldata accounts,
        uint256 id
    ) external onlyOwner {
        for (uint256 i = 0; i < accounts.length; i++) {
            _whitelist[accounts[i]][id] = true;
        }
        emit WhitelistAdded(accounts);
    }

    function airdrop(
        address[] calldata accounts,
        uint256 id
    ) external onlyOwner {
        for (uint256 i = 0; i < accounts.length; i++) {
            _mint(accounts[i], id, 1, "");
        }
    }

    function claim(uint256 id) external {
        require(_whitelist[msg.sender][id], "not whitelisted");
        require(!_claimed[msg.sender][id], "already claimed");

        _claimed[msg.sender][id] = true;
        emit Claimed(msg.sender, id, 1);

        _mint(msg.sender, id, 1, "");
    }

    function updateBaseUri(string calldata base) external onlyOwner {
        baseURI = base;
    }

    function uri(uint256 id) public view override returns (string memory) {
        return
            bytes(baseURI).length > 0
                ? string(abi.encodePacked(baseURI, id.toString()))
                : baseURI;
    }

    function _beforeTokenTransfer(
        address operator,
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) internal virtual override {
        super._beforeTokenTransfer(operator, from, to, ids, amounts, data);

        for (uint256 i = 0; i < ids.length; ++i) {
            require(from == address(0) || to == address(0), "non-transferable");
        }
    }
}
