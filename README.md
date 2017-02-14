**Please note that the IntelMQ Manager is currently not fully compatible with current IntelMQ! Please see the open issues for more details.**

![IntelMQ](http://s28.postimg.org/r2av18a3x/Logo_Intel_MQ.png)

**IntelMQ Manager** is a graphical interface to manage configurations for the [IntelMQ](https://github.com/certtools/intelmq) framework.
A IntelMQ configuration is a set of config files which describe which bots and processing steps should be run in which order. It is similar to describing the dataflow in [dataflow oriented](https://en.wikipedia.org/wiki/Dataflow_programming) languages.
**IntelMQ Manager** is therefore an intuitive tool to allow non-programmers to specify the data flow in IntelMQ.

## How to Install

See [INSTALL](https://github.com/certtools/intelmq-manager/blob/master/docs/INSTALL.md).

## Screenshots

#### Pipeline
This interface lets you visually configure the whole IntelMQ pipeline and the parameters of every single bot.
You will be able to see the pipeline in a graph-like visualisation similar to the following screenshot (click to enlarge):

![Main Interface](docs/screenshots/configuration.png?raw=true "Main Interface")

#### Bots Configuration
When you add a node or edit one you'll be presented with a form with the available parameters for a bot. There you can easily change the parameters as show in the screenshot:

![Parameter editing](docs/screenshots/configuration2.png?raw=true "Parameter editing")

After editing the bots' configuration and pipeline, simply click "Save Configuration" to automatically write the changes to the correct files.  The configurations are now ready to be deployed.

#### Botnet Management
When you save a configuration you can go to the 'Management' section to see what bots are running and start/stop the entire botnet, or a single bot.

![Botnet Management](docs/screenshots/management.png?raw=true "Botnet Management")

#### Botnet Monitoring
You can also monitor the logs of individual bots or see the status of the queues for the entire system or for single bots.

In this next example we can see the number of queued messages for all the queues in the system.
![Botnet Queues Monitor](docs/screenshots/monitor.png?raw=true "Botnet Monitor")

The following example we can see the status information of a single bot. Namely, the number of queued messages in the queues that are related to that bot and also the last 20 log lines of that single bot.
![Bot Monitor](docs/screenshots/monitor2.png?raw=true "Bot Monitor")

## Licence

This software is licensed under [GNU Affero General Public License version 3](https://github.com/certtools/intelmq-manager/blob/master/LICENSE)
