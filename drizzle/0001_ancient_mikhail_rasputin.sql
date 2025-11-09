CREATE TABLE `conferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`url` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `conferences_id` PRIMARY KEY(`id`),
	CONSTRAINT `conferences_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `organizations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `organizations_id` PRIMARY KEY(`id`),
	CONSTRAINT `organizations_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `presentations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`conferenceId` int NOT NULL,
	`organizationId` int NOT NULL,
	`title` text NOT NULL,
	`authorName` varchar(255),
	`keywords` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `presentations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `userFavorites` (
	`userId` int NOT NULL,
	`organizationId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now())
);
