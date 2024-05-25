### Connect with a snapshot instance database

For development purposes you can connect the backend to a snapshot of
the database, instead of one of the deployed instances (production and
staging). The easiest way is to create your own instance in the cloud,
and then delete it when you are done.

Once the instance is up, you can `pg_dump` it and run it locally if
needed.

List RDS snapshots to find the identifier of the snapshot want to restore

```bash
aws rds describe-db-snapshots \
    --db-instance-identifier <DB_INSTANCE_ID>
```

Use the snapshot identifier to restore a new DB instance. Replace next values for desired ones: `<NEW_DB_INSTANCE_ID>`, `<SNAPSHOT_ID>`, `<DB_SUBNET_GROUP_NAME>`, `<VPC_SECURITY_GROUP_IDS>`.

For `<DB_SUBNET_GROUP_NAME>` can look for names using next command, use the one of the desired one or database snapshot environment.

```bash
aws rds describe-db-subnet-groups
```

For `<VPC_SECURITY_GROUP_IDS>` can look for id using next command, use the one of the desired one or database snapshot environment.

```bash
aws ec2 describe-security-groups
```

Instance will start to be created after running restore command.

```bash
aws rds restore-db-instance-from-db-snapshot \
 --db-instance-identifier <NEW_DB_INSTANCE_ID> \
 --db-snapshot-identifier <SNAPSHOT_ID> \
 --db-instance-class db.t3.micro \
 --availability-zone us-east-1a  \
 --db-subnet-group-name <DB_SUBNET_GROUP_NAME> \
 --vpc-security-group-ids <VPC_SECURITY_GROUP_IDS> \
 --publicly-accessible
```

To connect backend to this database, copy your .env vars file from the environment you used to create the instance, and change only the database host value, with the new snapshot instance host url.

```bash
TYPEORM_HOST=<DATABASE_HOST>
```

Now you can run the project locally connected with snapshot instance.

```bash
pnpm run dev
```

### Connect with a local database

Configure in your .env the TypeORM values ​​that need to be changed in order to connect to your local database. TYPEORM_SSL should be set on `false` for local database, use `{ "rejectUnauthorized": false }` for stage and production.

```bash
TYPEORM_DATABASE=<database name>
TYPEORM_USERNAME=<username>
TYPEORM_PASSWORD=<password>
TYPEORM_HOST=localhost
TYPEORM_SSL=false
```
