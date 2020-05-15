function linuxCommand(code) {
	var command = "echo \"\" > compiled.c && echo \"\" > compiled && ";
	code = code.replace(/\"/g, '\\"')
	code = code.split("\n");

	for (var l = 0; l < code.length; l++) {
		command += 'echo "' + code[l] + '" >> compiled.c && '
	}

	command += "tcc compiled.c -o compiled && ./compiled"

	return command;
}

function compile(code, settings) {
	var include = {
		"stdio.h": false
	}

	var functions = {
		"main": []
	}

	// Parse the code
	for (var l = 0; l < code.length; l++) {
		var command = tokenize(code[l]);

		if (!command.ignore) {
			var parts = command.parts;

			var test = {
				print: parts[0].text == "print",
				var: parts[0].text == "var",
				input: parts[0].text == "input"
			}

			if (test.print) {
				functions.main.push(
					generateCommand([
						'printf("%s", ',
						parts[1].text,
						")"
					])
				);

				include["stdio.h"] = true;
			} else if (parts[2].text == "=") {
				if (test.var) {
					functions.main.push(
						generateCommand([
							"char ",
							parts[1].text,
							"[] = ",
							parts[3].text
						])
					);

					include["stdio.h"] = true;
				} else if (test.input) {
					functions.main.push(
						generateCommand([
							'printf("%s", ',
							parts[3].text,
							")"
						])
					);

					functions.main.push(
						generateCommand([
							"char ",
							parts[1].text,
							"[10]"
						])
					);

					functions.main.push(
						generateCommand([
							`scanf("%s", `,
							parts[1].text,
							")"
						])
					);
				}
			}
		}
	}

	// Generate includes
	var compiled = ``;
	var includeKeys = Object.keys(include);
	for (var i = 0; i < includeKeys.length; i++) {
		if(include[includeKeys[i]]) {
			compiled += `#include <` + includeKeys[i] + `>`;
			compiled += settings.newline;
		}
	}

	// Add a formatting space after includes
	compiled += settings.newline;

	// Some spahgetti code to compile a function, will fix later
	compiled += `int main() {`;
	for (var l = 0; l < functions.main.length; l++) {
		if (settings.makePretty) {
			compiled += settings.newline;
			compiled += "    ";
		}

		compiled += functions.main[l];
	}
	compiled += settings.newline + `}`;

	return compiled;
}

function generateCommand(parts) {
	return parts.join("") + ";";
}

function interface() {
	var user = document.getElementById("code");
	var output = document.getElementById("compiled");
	var command = document.getElementById("linuxCommand");

	var compiled = compile(
		user.value.split("\n"),
		{
			newline: "\n",
			indent: "   ",
			makePretty: true
		}
	);

	output.value = compiled;
	command.value = linuxCommand(compiled);
}

function tokenize(string) {
	var command = {
		parts: [],
		ignore: false,
	}

	var stringCheck = 0;
	var reading = "";

	var addPart = 0;
	var addType = "";

	if (string == "" || string[0] == '#') {
		command.ignore = true;
	} else {
		for (var c = 0; c < string.length; c++) {
			if (string[c] == '"') {
				if (stringCheck == 1) {
					stringCheck = 0;

					addPart = 1;
					addType = "string";
				} else {
					stringCheck = 1;
				}
			} else if (string[c] == ' ') {
				if (stringCheck == 0) {
					addPart = 2;
					addType = "raw";
				}
			}

			// Add part if on last char in string
			if (c + 1 == string.length) {
				addPart = 1;
			}

			// Unless adding non string to params, append char to reading
			if (addPart != 2) {
				reading += string[c];
			}

			if (addPart != 0 && string.length != 0) {
				command.parts.push({
					text: reading,
					type: addType
				});

				reading = "";
				addPart = 0;
			}
		}
	}

	return command;
}
