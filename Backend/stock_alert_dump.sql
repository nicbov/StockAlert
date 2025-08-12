-- MySQL dump 10.13  Distrib 9.3.0, for macos15.2 (arm64)
--
-- Host: localhost    Database: stock_alert
-- ------------------------------------------------------
-- Server version	9.2.0

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `stock_price_history`
--

DROP TABLE IF EXISTS `stock_price_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `stock_price_history` (
  `id` int NOT NULL AUTO_INCREMENT,
  `stock_symbol` varchar(10) NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `timestamp` datetime DEFAULT CURRENT_TIMESTAMP,
  `market_event` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2784 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `stock_price_history`
--

LOCK TABLES `stock_price_history` WRITE;
/*!40000 ALTER TABLE `stock_price_history` DISABLE KEYS */;
INSERT INTO `stock_price_history` VALUES (2773,'AAPL',206.87,'2025-05-20 13:00:01','close'),(2774,'SOUN',9.98,'2025-05-20 13:00:02','close'),(2775,'NVDA',134.38,'2025-05-20 13:00:02','close'),(2776,'BBAI',3.55,'2025-05-20 13:00:02','close'),(2777,'AAPL',206.87,'2025-05-20 13:00:02','close'),(2778,'LULU',327.34,'2025-05-20 13:00:02','close'),(2779,'GOOG',165.32,'2025-05-20 13:00:02','close'),(2780,'URBN',61.35,'2025-05-20 13:00:02','close'),(2781,'NKE',62.58,'2025-05-20 13:00:02','close'),(2782,'BBAI',3.55,'2025-05-20 13:00:02','close'),(2783,'GOOGL',163.98,'2025-05-20 13:00:02','close');
/*!40000 ALTER TABLE `stock_price_history` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tracked_stocks`
--

DROP TABLE IF EXISTS `tracked_stocks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tracked_stocks` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `ticker_symbol` varchar(10) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `tracked_stocks_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tracked_stocks`
--

LOCK TABLES `tracked_stocks` WRITE;
/*!40000 ALTER TABLE `tracked_stocks` DISABLE KEYS */;
INSERT INTO `tracked_stocks` VALUES (1,1,'AAPL'),(3,2,'SOUN'),(6,2,'NVDA'),(7,3,'BBAI'),(9,3,'AAPL'),(10,3,'LULU'),(12,3,'GOOG'),(13,3,'URBN'),(14,3,'NKE'),(18,2,'BBAI'),(19,2,'GOOGL');
/*!40000 ALTER TABLE `tracked_stocks` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `email` varchar(255) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `phone` (`phone`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'test@example.com','$2y$10$E.8EoP9tq8gDCk4k4PdSxeH9tT/SXimZJ83BjozV7lMT89I/5lE6K','1234567890'),(2,'nico.boving@gmail.com','$2b$10$N9isklnLOPdNjVDz74/GYOXZyUr/9LtPstVBk7T/s5d79SzEMuOia','3108030671'),(3,'blevins723tyler@gmail.com','$2b$10$8jq8Us6bfLdxS0BJuy4lUepV6O01cOf4LdJ4lK.BlwWsfVr5NAqwy',NULL);
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-05-27 16:09:37
