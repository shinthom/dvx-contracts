pragma solidity 0.8.0;

interface IAccount {
    event Deposited(address indexed account, address indexed token, uint256 amount);
    event Withdrawn(address indexed account, address indexed token, uint256 amount);

    function deposit(address token, uint256 amount) external;
    function depositETH(uint256 amount) payable external;
    function withdraw(address token, uint256 amount) external;
    function withdrawETH(uint256 amount) payable external;
}