// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

interface IPositionRouter {

    struct IncreasePositionRequest {
        address account;
        address[] path;
        address indexToken;
        uint256 amountIn;
        uint256 minOut;
        uint256 sizeDelta;
        bool isLong;
        uint256 acceptablePrice;
        uint256 executionFee;
        uint256 blockNumber;
        uint256 blockTime;
        bool hasCollateralInETH;
        address callbackTarget;
    }

    function depositFee() external view returns (uint256);
    function minExecutionFee() external view returns (uint256);
    function BASIS_POINTS_DIVISOR() external view returns (uint256);

    function increasePositionRequests(bytes32 key) external view returns (IncreasePositionRequest memory);

    function createIncreasePosition(
        address[] memory _path,
        address _indexToken,
        uint256 _amountIn,
        uint256 _minOut,
        uint256 _sizeDelta,
        bool _isLong,
        uint256 _acceptablePrice,
        uint256 _executionFee,
        bytes32 _referralCode,
        address _callbackTarget
    ) external payable returns (bytes32);

    function createIncreasePositionETH(
        address[] memory _path,
        address _indexToken,
        uint256 _minOut,
        uint256 _sizeDelta,
        bool _isLong,
        uint256 _acceptablePrice,
        uint256 _executionFee,
        bytes32 _referralCode,
        address _callbackTarget
    ) external payable returns (bytes32);

    function createDecreasePosition(
        address[] memory _path,
        address _indexToken,
        uint256 _collateralDelta,
        uint256 _sizeDelta,
        bool _isLong,
        address _receiver,
        uint256 _acceptablePrice,
        uint256 _minOut,
        uint256 _executionFee,
        bool _withdrawETH,
        address _callbackTarget
    ) external payable returns (bytes32);

    function executeIncreasePosition(bytes32 key, address payable feeReceiver) external;
    function executeDecreasePosition(bytes32 _key, address payable _executionFeeReceiver) external returns (bool);
    function increasePositionsIndex(address _account) external view returns (uint256);
    function decreasePositionsIndex(address _account) external view returns (uint256);
    function getRequestKey(address _account, uint256 _index) external pure returns (bytes32);

    // test
    function setDelayValues(uint256 _minBlockDelayKeeper, uint256 _minTimeDelayPublic, uint256 _maxTimeDelay) external;
    function setPositionKeeper(address _account, bool _isActive) external;
    function isPositionKeeper(address _account) external view returns (bool);
}