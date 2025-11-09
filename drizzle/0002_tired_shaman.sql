CREATE TABLE `userKeywords` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`keyword` varchar(255) NOT NULL,
	`searchedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `userKeywords_id` PRIMARY KEY(`id`)
);
