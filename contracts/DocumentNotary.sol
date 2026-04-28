// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract DocumentNotary {

    struct Record {
        address uploader;
        uint256 timestamp;
    }
    
    mapping(bytes32 => Record) public records;


    event HashAnchored(
        bytes32 indexed fileHash,
        address indexed uploader,
        uint256 timestamp
    );
    

    function anchorHash(bytes32 _fileHash) external {
        require(
            records[_fileHash].uploader == address(0),
            "DocumentNotary: Hash already exists"
        );
        require(
            _fileHash != bytes32(0),
            "DocumentNotary: Invalid hash"
        );
        
        records[_fileHash] = Record({
            uploader: msg.sender,
            timestamp: block.timestamp
        });
        
        emit HashAnchored(_fileHash, msg.sender, block.timestamp);
    }
    

    function hashExists(bytes32 _fileHash) external view returns (bool) {
        return records[_fileHash].uploader != address(0);
    }
    

    function getHashDetails(bytes32 _fileHash) external view returns (Record memory) {
        require(
            records[_fileHash].uploader != address(0),
            "DocumentNotary: Hash not found"
        );
        return records[_fileHash];
    }
    

    function getUploader(bytes32 _fileHash) external view returns (address) {
        return records[_fileHash].uploader;
    }


    function getTimestamp(bytes32 _fileHash) external view returns (uint256) {
        return records[_fileHash].timestamp;
    }
}
