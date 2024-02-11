pragma solidity 0.8.4;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import IAccount from "./interfaces/IAccount.sol";
import "hardhat/console.sol";

contract AttendanceBook is Ownable {
    address public relayer;
    uint256 public eventStartTimestamp;
    bool public activated = true;

    mapping(address => mapping(uint8 => uint8)) public userHistory;

    event CheckedIn(address indexed user, uint256 indexed day);

    constructor(
        address _relayer,
        uint _eventStartTimestamp
    ) {
        relayer = _relayer;
        eventStartTimestamp = _eventStartTimestamp;
    }

    modifier onlyRelayer() {
        require(msg.sender == relayer, "MSG_SENDER_IS_NOT_RELAYER");
        _;
    }

    function getDay() public view returns (uint256) {
        if (block.timestamp < eventStartTimestamp) {
            return 0;
        } else {
            return 1 + (block.timestamp - eventStartTimestamp) / (3600); //day is changed every 1 hour for testing
            //return 1 + (block.timestamp - eventStartTimestamp) / (3600 * 24);
        }
    }

    function getUserHistory(
        address user,
        uint256 from,
        uint256 to
    ) external view returns (uint256[] memory) {
        uint256[] memory history = new uint256[](to - from + 1);
        for (uint256 i = from; i <= to; i++) {
            history[i - from] = userHistory[user][i];
        }
        return history;
    }

    function checkIn(
        address _account,
        address _feeToken,
        uint256 _feeAmount,
        uint256 _networkFee,
        uint256 _deadline,
        bytes _signature
    ) external onlyRelayer {
        require(activated, "EVENT_NOT_ACTIVATED");
        require(
            userHistory[_account][day] == 0,
            "ALREADY_CHECKED_IN_TODAY"
        );
        IAccount(account).withdraw(_feeToken, address(this), _feeAmount, _networkFee, _deadline, _signature);

        uint256 day = getDay();
        userHistory[_account][day] = 1;
        emit CheckedIn(_account, day);
    }

    function changeRelayer(address _relayer) external onlyOwner {
        relayer = _relayer;
    }

    function withdraw(address _token, uint256 _amount) external onlyOwner {
        IERC20(_token).transfer(owner(), _amount);
    }

    function deactivate() external onlyOwner {
        activated = false;
    }
}