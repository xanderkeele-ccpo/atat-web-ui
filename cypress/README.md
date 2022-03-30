# Setting up Cypress

[Optional]Install Cypress globally:

```
$ `npm i -g cypress@^^9.5.1`
```

### To Open Cypress window

```
node ./node_modules/cypress/bin/cypress open
or
npx cypress open

```

### To run Cypress tests using Cypress command line AKA Cypress CLI

```
npm run test:e2e
```

### To run Cypress tests on edge

```
npm run test:e2e --browser edge
```

### To run Cypress tests on chrome

```
npm run test:e2e --browser chrome
```

### Setting Environment Variables

Create a `.env` file in the project's root directory and use the following Environment Variables:

| Environment Variable Name | Description          |
| ------------------------- | -------------------- |
| 'testURL'                 | PortalUrl            |
| 'SNOWUSER'                | Your username to use |
| 'SNOWPASS'                | password             |

```

```