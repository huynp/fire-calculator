CREATE TABLE `fire_scenarios` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`currentBalance` decimal(15,2) NOT NULL,
	`annualReturn` decimal(5,2) NOT NULL,
	`monthlyContribution` decimal(15,2) NOT NULL,
	`monthlyExpense` decimal(15,2) NOT NULL,
	`currentAge` int NOT NULL,
	`retirementAge` int NOT NULL,
	`inflationRate` decimal(5,2) NOT NULL,
	`safeWithdrawalRate` decimal(5,2) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `fire_scenarios_id` PRIMARY KEY(`id`)
);
