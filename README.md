# Installation

Grab [the latest release](https://github.com/blockchain-lab-um/moodle-eductx-plugin/releases/latest) and install it to Moodle environment as any other plugin.

## Deployment

### Prerequisites

- Node.js and npm (for Grunt)
- [just](https://github.com/casey/just) command runner

### Bundle

From the `mod/eductx` directory, run:

```bash
just bundle
```

This will compile the AMD JavaScript modules and create an `eductx.zip` archive in the `mod/` directory.

Upload the zip via **Site administration > Plugins > Install plugins** in your Moodle instance.
