/**
 * Copyright 2017, Google, Inc.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

const path = require(`path`);
const assert = require(`assert`);
const tools = require(`@google-cloud/nodejs-repo-tools`);
const execa = require(`execa`);
const delay = require(`delay`);
const {Logging} = require('@google-cloud/logging');
const logging = new Logging();
const got = require('got');

before(tools.checkCredentials);
const lb = require('@google-cloud/logging-bunyan');
const {APP_LOG_SUFFIX} = lb.express;

it(`should write using bunyan`, async () => {
  // Start the express server.
  execa(process.execPath, ['express.js'], {
    cwd: path.join(__dirname, `..`),
    cleanup: true, // kill child process when parent exits.
  }).stdout.pipe(process.stdout);

  // Wait 10 seconds for initialization and for server to start listening.
  await delay(10 * 1000);

  // Make an HTTP request to exercise a request logging path.
  await got('http://localhost:8080/');

  // Wait 10 seconds for logs to be written to stackdriver service.
  await delay(10 * 1000);

  // Make sure the log was written to Stackdriver Logging.
  const log = logging.log(`samples_express_${APP_LOG_SUFFIX}`);
  const entries = (await log.getEntries({pageSize: 1}))[0];
  assert.strictEqual(entries.length, 1);
  const entry = entries[0];
  assert.strictEqual('this is an info log message', entry.data.message);
  assert.ok(entry.metadata.trace, 'should have a trace property');
  assert.ok(entry.metadata.trace.match(/projects\/.*\/traces\/.*/));
});
