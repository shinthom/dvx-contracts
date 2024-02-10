// SPDX-License-Identifier: MIT
pragma solidity 0.8.7;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./ERC5633.sol";

contract SBT is ERC5633, Ownable {
    mapping(uint256 => string) private _uris;

    constructor() ERC1155("") {}

    function setSoulbound(uint256 id) external onlyOwner {
        require(!isSoulbound(id), "NTx: already soulbound");

        _setSoulbound(id, true);
    }

    function setURI(uint256 id, string memory newuri) external onlyOwner {
        _uris[id] = newuri;
        emit URI(newuri, id);
    }

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
        require(accounts.length == amounts.length, "NTx: length mismatch");

        for (uint256 i = 0; i < accounts.length; i++) {
            require(amounts[i] != 0, "NTx: zero amount");

            _mint(accounts[i], id, amounts[i], "");
        }
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

    // function supportsInterface(bytes4 interfaceId) public view override(ERC5633) returns (bool) {
    //     return super.supportsInterface(interfaceId);
    // }

    function uri(uint256 id) public view override returns (string memory) {
        return _uris[id];
    }
}
