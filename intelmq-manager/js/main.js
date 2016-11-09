var defaults = {};
var nodes = {};
var edges = {};
var bots = {};

var graph = null;
var graph_container = null;
var popup = null;
var title = null;
var fields = null;

$(window).on('hashchange', function() {
    location.reload();
});

$(window).on('unload', function() {
    return "If you have not saved your work you'll loose the changes you have made. Do you want to continue?";
});

function resize() {
    // Resize body
    var graph_container = document.getElementById('graph-container');
    graph_container.style.height = (window.innerHeight - graph_container.offsetTop) + "px";
    graph_container.style.overflowX = "auto";
    graph_container.style.overflowY = "auto";

    if (graph != null && graph != undefined) {
        graph.redraw();
        graph.zoomExtent();
    }

    load_html_elements();
}

function load_html_elements() {
    // Load popup, title and fields
    graph_container = document.getElementById('graph-container');
    popup = document.getElementById('graph-popUp');
    title = document.getElementById('graph-popUp-title');
    fields = document.getElementById('graph-popUp-fields');
}

function load_file(url, callback) {
    $.getJSON(url)
        .done(function (json) {
            callback(json);
        })
        .fail(function (jqxhr, textStatus, error) {
            var err = textStatus + ", " + error;
            show_error('Failed to obtain JSON: ' + url + ' with error: ' + err);
            callback({});
        });
}

function load_bots(config) {
    var available_bots = document.getElementById("side-menu")
    //available_bots.innerHTML = '';

    for(bot_group in config) {
        var group = config[bot_group];

        group_title = document.createElement('a');
        group_title.innerHTML = bot_group + '<span class="fa arrow"></span>';

        var new_element = group_title.cloneNode(true);

        bots_submenu = document.createElement('ul');
        bots_submenu.setAttribute('class', 'nav nav-second-level collapse');

        group_menu = document.createElement('li');
        group_menu.appendChild(new_element);
        group_menu.appendChild(bots_submenu);
        group_menu.style.borderBottomColor = GROUP_COLORS[bot_group];

        available_bots.appendChild(group_menu);

        for (bot_name in group) {
            var bot = group[bot_name];

            var bot_title = document.createElement('a');
            bot_title.setAttribute('data-toggle', 'tooltip');
            bot_title.setAttribute('data-placement', 'right');
            bot_title.setAttribute('title', bot['description']);
            bot_title.setAttribute('onclick', 'fill_bot(undefined, "' + bot_group + '", "' + bot_name + '")');
            bot_title.innerHTML = bot_name;

            var bot_submenu = document.createElement('li');
            bot_submenu.appendChild(bot_title);

            bots_submenu.appendChild(bot_submenu);

            if (bots[bot_group] === undefined) {
                bots[bot_group] = {};
            }

            bots[bot_group][bot_name] = {
                'name': bot_name,
                'group': bot_group,
                'module': bot['module'],
                'description': bot['description']
            }

            for (parameter in bot['parameters']) {
                var value = bot['parameters'][parameter];
                bots[bot_group][bot_name][parameter] = value;
            }
        }
    }

    $('#side-menu').metisMenu({'restart': true});

    if (window.location.hash != '#new') {
        load_file(DEFAULTS_FILE, load_defaults);
    } else {
        draw();
        resize();
    }
}

function load_defaults(config) {
    defaults = read_defaults_conf(config);

    load_file(RUNTIME_FILE, load_runtime);
}

function load_runtime(config) {
    nodes = read_runtime_conf(config);

    load_file(PIPELINE_FILE, load_pipeline);
}

function load_pipeline(config) {
    edges = read_pipeline_conf(config, nodes);
    nodes = add_defaults_to_nodes(nodes, defaults);

    draw();
    resize();
}

function save_data_on_files() {
    if(!confirm("By clicking 'OK' you are replacing the configuration in your files by the one represented by the graph on this page. Do you agree?")) {
        return;
    }

    nodes = remove_defaults(nodes, defaults);

    var alert_error = function (file, jqxhr, textStatus, error) {
        show_error('There was an error saving ' + file + ':\nStatus: ' + textStatus + '\nError: ' + error);
    }

    $.post('./php/save.php?file=runtime', generate_runtime_conf(nodes))
        .fail(function (jqxhr, textStatus, error) {
            alert_error('runtime', jqxhr, textStatus, error);
        });

    $.post('./php/save.php?file=pipeline', generate_pipeline_conf(edges))
        .fail(function (jqxhr, textStatus, error) {
            alert_error('pipeline', jqxhr, textStatus, error);
        });

    nodes = add_defaults_to_nodes(nodes, defaults);
}

function convert_edges(edges) {
    var new_edges = [];

    for (index in edges) {
        var new_edge = {};
        new_edge.id = edges[index]['id'];
        new_edge.from = edges[index]['from'];
        new_edge.to = edges[index]['to'];

        new_edges.push(new_edge);
    }

    return new_edges;
}

function convert_nodes(nodes) {
    var new_nodes = [];

    for (index in nodes) {
        var new_node = {};
        new_node.id = nodes[index]['id'];
        new_node.label = nodes[index]['id'];
        new_node.group = nodes[index]['group'];
        new_node.title = JSON.stringify(nodes[index], undefined, 2).replace(/\n/g, '\n<br>').replace(/ /g, "&nbsp;");

        new_nodes.push(new_node);
    }

    return new_nodes;
}

var parameter_groups = {
  'specific': {
    'name': 'Bot parameters',
    'keys': ['id']
  },
  'feed-info': {
    'name': 'Feed information',
    'keys': ['provider', 'feed', 'code', 'accuracy']
  },
  'type-info': {
    'name': 'Bot type information',
    'keys': ['group', 'name', 'module', 'description']
  },
  'http': {
    'name': 'HTTP Request parameters',
    'keys': ['http_username', 'http_password', 'http_header', 'http_user_agent',
             'http_proxy', 'https_proxy', 'http_verify_cert', 'ssl_client_certificate']
  },
  'mail': {
    'name': 'Mail configuration',
    'keys': ['mail_host', 'mail_user', 'mail_password', 'mail_ssl']
  },
  'errors': {
    'name': 'Error configuration',
    'keys': ['error_procedure', 'error_log_message', 'error_log_exception',
             'error_dump_message', 'error_max_retries', 'error_retry_delay']
  },
  'pipeline': {
    'name': 'Pipeline configuration',
    'keys': ['broker', 'load_balance',
             'source_pipeline_db', 'source_pipeline_host', 'source_pipeline_port',
             'destination_pipeline_db', 'destination_pipeline_host', 'destination_pipeline_port']
  },
  'logging': {
    'name': 'Logging configuration',
    'keys': ['logging_level', 'logging_handler', 'logging_path', 'logging_syslog']
  }
}

var handled_keys = [];
for (var k in parameter_groups) {
  handled_keys = handled_keys.concat(parameter_groups[k].keys);
}

function build_section(name, bot, visible) {

  var content = '';
  var keys = parameter_groups[name].keys;
  for (var i=0; i < keys.length; i++) {
    if (bot[keys[i]] !== undefined) {
      content += '<li class="form-group"><label>' + keys[i] + '</label><input type="text" id="node-' +
                 keys[i] + '" class="form-control" value="' + bot[keys[i]] + '"></li>';
    }
  }

  // No keys for this section found, skip
  if (content.length === 0) {
    return '';
  } else {
    return compose_build(name, visible, content);
  }

}

function compose_build(name, visible, content) {

  var visibility = '';
  if (visible) {
    visibility = ' in'
  }

  var verbose_name = parameter_groups[name].name;
  var basics = '<div class="panel panel-default"><div class="panel-heading"><h4 class="panel-title">' +
               '<a href="#' + name + '" data-toggle="collapse">' + verbose_name + '</a></h4></div>' +
               '<div class="panel-collapse collapse' + visibility + '" role="tabpanel" id="' + name + '">' +
               '<ul class="list-group form-inline">' + content + '</ul></div></div>';
  return basics;
}

function add_bot_specific_info(bot) {
  // start with id
  content = '<li class="form-group"><label>id</label><input type="text" id="node-id" class="form-control" value="' + bot.id + '"></li>';
  var bot_keys = Object.keys(bot);
  var specific_keys = $(bot_keys).not(handled_keys).get();

  for (var i=0; i < specific_keys.length; i++) {
    content += '<li class="form-group"><label>' + specific_keys[i] + '</label><input type="text" id="node-' +
               specific_keys[i] + '" class="form-control" value="' + bot[specific_keys[i]] + '"></li>';
  }
  return compose_build('specific', true, content);
}

function build_info(bot) {
  var content = '';
  content += build_section('type-info', bot, true);
  content += add_bot_specific_info(bot);
  if (bot.group === 'Collector') {
    show = true;
  } else {
    show = false;
  }
  content += build_section('feed-info', bot, show);
  content += build_section('mail', bot, show);
  content += build_section('http', bot, show);
  content += build_section('logging', bot, false);
  content += build_section('errors', bot, false);
  content += build_section('pipeline', bot, false);

  return content;
}

function fill_bot(id, group, name) {
    var bot = {};
    fields.innerHTML = '';

    if (id === undefined) {
        bot = bots[group][name];
        var name = bot['name'].replace(/\ /g,'-').replace(/[^A-Za-z0-9-]/g,'');
        var group = bot['group'].replace(/\ /g,'-');
        bot.id = (name + "-" + group).toLowerCase();
    } else {
        bot = nodes[id];
        var element = document.createElement("input");
        element.setAttribute('type', 'hidden');
        element.setAttribute('id', 'old-id-from-node');
        element.setAttribute('value', id);
        popup.appendChild(element);
    }

    $(fields).append(build_info(bot));
    popup.setAttribute('class', "with-bot");
}

function saveData(data,callback) {
    var idInput = document.getElementById('node-id');
    var groupInput = document.getElementById('node-group');
    var oldIdInput = document.getElementById('old-id-from-node');

    if (idInput == undefined && groupInput == undefined) {
        return;
    }

    if (oldIdInput != undefined) {
        if (idInput.value != oldIdInput.value) {
            if(!confirm("When you edit an ID what you are doing in fact is to create a clone of the current bot. You will have to delete the old one manually. Proceed with the operation?")) {
                return;
            }
        }
    }

    data.id = idInput.value;
    data.group = groupInput.value;
    //data.level = GROUP_LEVELS[data.group];

    if (!BOT_ID_REGEX.test(data.id)) {
        show_error("Bot ID's can only be composed of numbers, letters and hiphens");
        return;
    }

    node = {};

    var inputs = document.getElementsByTagName("input");
    for(var i = 0; i < inputs.length; i++) {
        if(inputs[i].id.indexOf('node-') == 0) {
            var key = inputs[i].id.replace('node-', '');
            var value = null;

            try {
                value = JSON.parse(inputs[i].value);
            } catch (err) {
                value = inputs[i].value;
            }
            node[key] = value;
        }
    }

    data.label = node['id'];

    data.title = JSON.stringify(node, undefined, 2).replace(/\n/g, '\n<br>').replace(/ /g, "&nbsp;");

    nodes[data.id] = node;

    clearPopUp();
    callback(data);
}

function create_form(title_string, data, callback){
    title.innerHTML = title_string;

    var saveButton = document.getElementById('graph-popUp-save');
    var cancelButton = document.getElementById('graph-popUp-cancel');
    saveButton.onclick = saveData.bind(this, data, callback);
    cancelButton.onclick = clearPopUp.bind();

    fields.innerHTML="<p>Please select one of the bots on the left</p>";
    popup.style.display = 'block';
    popup.setAttribute('class', "without-bot");
}

function clearPopUp() {
    var saveButton = document.getElementById('graph-popUp-save');
    var cancelButton = document.getElementById('graph-popUp-cancel');
    saveButton.onclick = null;
    cancelButton.onclick = null;

    popup.style.display = 'none';
    title.innerHTML = '';
    fields.innerHTML = '';
    popup.setAttribute('class', "without-bot");
}

function draw() {
    load_html_elements();

    var data = {};

    if (window.location.hash == '#load') {
        data = {
            nodes: convert_nodes(nodes),
            edges: convert_edges(edges)
        };
    }

    var options = {
        physics: {
            barnesHut: {
                enabled: false
            },
            repulsion: {
                nodeDistance: 200,
                springLength: 200
            }
        },
        tooltip: {
            fontFace: 'arial',
            delay: 1000
        },
        nodes: {
            fontFace: 'arial'
        },
        edges: {
            fontFace: 'arial',
            length: 500,
            width: 3,
            style: 'arrow',
            arrowScaleFactor: 0.5
        },
        groups: {
            Collector: {
//                shape: 'circle',
                shape: 'box',
                color: GROUP_COLORS['Collector'],
            },
            Parser: {
//                shape: 'ellipse',
                shape: 'box',
                color: GROUP_COLORS['Parser']
            },
            Expert: {
                shape: 'box',
                color: GROUP_COLORS['Expert'],
                fontColor: "#FFFFFF"
            },
            Output: {
//                shape: 'database',
                shape: 'box',
                color: GROUP_COLORS['Output']
            }
        },
        stabilize: false,
        dataManipulation: {
            enabled: true,
            initiallyVisible: true
        },
        navigation: true,
        onAdd: function(data,callback) {
            create_form("Add Node", data, callback);
        },
        onEdit: function(data,callback) {
            create_form("Edit Node", data, callback);
            fill_bot(data.id, undefined, undefined);
        },
        onConnect: function(data,callback) {
            if (data.from == data.to) {
                show_error('This action would cause an infinite loop');
                return;
            }

            for (index in edges) {
                if (edges[index].from == data.from && edges[index].to == data.to) {
                    show_error('There is already a link between those bots');
                    return;
                }
            }

            var neighbors = ACCEPTED_NEIGHBORS[nodes[data.from].group];
            var available_neighbor = false;
            for (index in neighbors) {
                if (nodes[data.to].group == neighbors[index]) {
                    callback(data);
                    available_neighbor = true;
                }
            }

            if (!available_neighbor) {
                if (neighbors.length == 0) {
                    show_error("Node type " + nodes[data.from].group + " can't connect to other nodes");
                } else {
                    show_error('Node type ' + nodes[data.from].group + ' can only connect to nodes of types: ' + neighbors.join());
                }
                return;
            }


            if (edges[data.id] === undefined) {
                edges[data.id] = {};
            }

            edges[data.id]={'from': data.from, 'to': data.to};
        },
        onDelete: function(data,callback) {
            callback(data);

            for (index in data.edges) {
                delete edges[data.edges[index]];
            }

            for (index in data.nodes) {
                delete nodes[data.nodes[index]];
            }
        }
    };

    graph = new vis.Graph(graph_container, data, options);

    setTimeout(function () {
        graph.zoomExtent();
    }, 2000);
}

/*
 * Application entry point
 */

// Dynamically load available bots
load_file(BOTS_FILE, load_bots);

// Dynamically adapt to fit screen
window.onresize = resize;
