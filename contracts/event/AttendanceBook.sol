pragma solidity 0.8.7;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IAccount} from "../interfaces/IAccount.sol";

contract AttendanceBook is Ownable {
    uint256 public startTime;
    bool public activated;

    mapping(address => mapping(uint256 => uint256)) public accountHistory;

    address public relayer;

    event CheckedIn(address indexed account, uint256 indexed day);

    constructor(uint256 _startTime, address _relayer) {
        require(_startTime > block.timestamp, "invalid start time");
        require(_relayer != address(0), "invalid relayer");

        startTime = _startTime;
        activated = true;
        relayer = _relayer;
    }

    function getDay() public view returns (uint256) {
        if (block.timestamp < startTime) {
            return 0;
        }
        return 1 + (block.timestamp - startTime) / (3600 * 24);
    }

    function getAccountHistory(
        address account,
        uint256 from,
        uint256 to
    ) external view returns (uint256[] memory) {
        require(from > 0, "invalid from");
        require(to >= from, "invalid to");

        uint256[] memory history = new uint256[](to - from + 1);
        for (uint256 i = from; i <= to; i++) {
            history[i - from] = accountHistory[account][i];
        }
        return history;
    }

    function checkIn(
        address account,
        uint256 deadline,
        bytes calldata signature
    ) external {
        address accountOwner = IAccount(account).owner();
        require(
            msg.sender == accountOwner || msg.sender == relayer,
            "not account owner or relayer"
        );

        if (msg.sender == relayer) {
            (address wallet, uint256 expiration) = IAccount(account)
                .delegatedAccount();
            require(expiration > block.timestamp, "delegatedAccount: expired");

            _verifySignature(
                deadline,
                wallet,
                keccak256(abi.encodePacked(account, deadline)),
                signature
            );
        }

        _checkIn(account);
    }

    function _checkIn(address account) private {
        require(activated, "not activated");
        require(block.timestamp > startTime, "not started");

        uint256 day = getDay();
        require(accountHistory[account][day] == 0, "already checked-in");

        accountHistory[account][day] = 1;
        emit CheckedIn(account, day);
    }

    function changeRelayer(address _relayer) external onlyOwner {
        require(_relayer != address(0), "invalid relayer");
        relayer = _relayer;
    }

    function deactivate() external onlyOwner {
        activated = false;
    }

    function _verifySignature(
        uint256 deadline,
        address signer,
        bytes32 messageHash,
        bytes memory signature
    ) private view returns (bool) {
        require(deadline >= block.timestamp, "deadline: expired");

        return
            _recoverSigner(_getEthSignedMessageHash(messageHash), signature) ==
            signer;
    }

    function _getEthSignedMessageHash(
        bytes32 _messageHash
    ) private pure returns (bytes32) {
        return
            keccak256(
                abi.encodePacked(
                    "\x19Ethereum Signed Message:\n32",
                    _messageHash
                )
            );
    }

    function _recoverSigner(
        bytes32 message,
        bytes memory signature
    ) private pure returns (address) {
        (bytes32 r, bytes32 s, uint8 v) = _splitSignature(signature);

        return ecrecover(message, v, r, s);
    }

    function _splitSignature(
        bytes memory sig
    ) private pure returns (bytes32 r, bytes32 s, uint8 v) {
        require(sig.length == 65, "invalid signature length");

        assembly {
            r := mload(add(sig, 32))
            s := mload(add(sig, 64))
            v := byte(0, mload(add(sig, 96)))
        }
    }
}
