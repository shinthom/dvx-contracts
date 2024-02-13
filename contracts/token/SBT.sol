// SPDX-License-Identifier: MIT
pragma solidity 0.8.7;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract SBT is ERC1155, Ownable {
    using Strings for uint256;

    string private baseURI;
    mapping(address => bool) public whitelist;

    event WhitelistAdded(address[] accounts);
    event Claimed(address indexed account, uint256 id, uint256 amount);

    constructor() ERC1155("") {}

    function mint(
        address account,
        uint256 id,
        uint256 amount
    ) external onlyOwner {
        _mint(account, id, amount, "");
    }

    function mintBatch(
        address account,
        uint256[] memory ids,
        uint256[] memory amounts
    ) external onlyOwner {
        _mintBatch(account, ids, amounts, "");
    }

    function airdrop(
        address[] calldata accounts,
        uint256 id,
        uint256[] calldata amounts
    ) external onlyOwner {
        require(accounts.length == amounts.length, "length mismatch");

        for (uint256 i = 0; i < accounts.length; i++) {
            require(amounts[i] != 0, "zero amount");

            _mint(accounts[i], id, amounts[i], "");
        }
    }

    function claim(uint256 id, uint256 amount) external {
        require(whitelist[msg.sender], "not whitelisted");

        _mint(msg.sender, id, amount, "");
        emit Claimed(msg.sender, id, amount);
    }

    function burn(
        address account,
        uint256 id,
        uint256 amount
    ) external onlyOwner {
        _burn(account, id, amount);
    }

    function burnBatch(
        address account,
        uint256[] memory ids,
        uint256[] memory amounts
    ) external onlyOwner {
        _burnBatch(account, ids, amounts);
    }

    function addWhitelist(address[] calldata accounts) external onlyOwner {
        for (uint256 i = 0; i < accounts.length; i++) {
            whitelist[accounts[i]] = true;
        }
        emit WhitelistAdded(accounts);
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
            require(
                from == address(0) || to == address(0),
                "non-transferable"
            );
        }
    }
}
