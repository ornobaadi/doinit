import pg from 'pg';

const regions = [
  'ap-southeast-1', // Singapore
  'ap-northeast-1', // Tokyo
  'us-east-1',      // N. Virginia
  'us-east-2',      // Ohio
  'us-west-1',      // N. California
  'us-west-2',      // Oregon
  'eu-west-1',      // Ireland
  'eu-west-2',      // London
  'eu-west-3',      // Paris
  'eu-central-1',   // Frankfurt
  'ap-southeast-2', // Sydney
  'ap-south-1',     // Mumbai
  'ap-northeast-2', // Seoul
  'ca-central-1',   // Canada Central
  'sa-east-1',      // São Paulo
  'eu-central-2',   // Zurich
  'eu-north-1',     // Stockholm
  'ap-southeast-3', // Jakarta
  'ap-southeast-4', // Melbourne
  'ap-east-1',      // Hong Kong
  'me-central-1',   // UAE
  'af-south-1',     // Cape Town
  'il-central-1'    // Israel
];

const username = 'postgres.enlexomftqcyoxzwzndc';
const password = 'FODngYfYsyImS0px';
const database = 'postgres';

async function testRegion(region) {
  const host = `aws-0-${region}.pooler.supabase.com`;
  const client = new pg.Client({
    host,
    port: 6543,
    user: username,
    password: password,
    database: database,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 5000,
  });

  try {
    console.log(`Testing region ${region} (${host})...`);
    await client.connect();
    console.log(`>>> SUCCESS: Connected to region ${region}!`);
    await client.end();
    return true;
  } catch (err) {
    console.log(`Failed for region ${region}: ${err.message}`);
    try {
      await client.end();
    } catch (e) {}
    return false;
  }
}

async function run() {
  for (const region of regions) {
    const success = await testRegion(region);
    if (success) {
      console.log(`\nFound correct region: ${region}`);
      process.exit(0);
    }
  }
  console.log('\nFinished testing all regions. None connected.');
}

run();
