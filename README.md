# Secure-Distributed-Storage
🔐 Secure Distributed Storage using DHT with Cryptographic Protection

This project presents a secure distributed storage architecture that combines decentralized storage mechanisms with strong cryptographic security.

The system uses a Distributed Hash Table (DHT) to distribute and retrieve data efficiently across nodes without relying on a central authority.

To ensure security:

RSA is used for secure key exchange and asymmetric encryption.

SHA (Secure Hash Algorithm) is used to generate cryptographic hashes for verifying data integrity.

AES in Galois/Counter Mode (GCM) provides authenticated encryption, ensuring both confidentiality and integrity of stored data.

🔍 System Workflow

File is hashed using SHA to generate a unique identifier.

Data is encrypted using AES-GCM.

Encryption keys are secured using RSA.

Encrypted data is stored across distributed nodes via DHT.

During retrieval, integrity is verified using hash comparison.