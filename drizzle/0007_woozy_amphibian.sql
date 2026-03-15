CREATE TABLE `pre_authorized_emails` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`role` enum('user','admin','student','teacher') NOT NULL DEFAULT 'teacher',
	`note` varchar(255),
	`addedBy` int,
	`usedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `pre_authorized_emails_id` PRIMARY KEY(`id`),
	CONSTRAINT `pre_authorized_emails_email_unique` UNIQUE(`email`)
);
