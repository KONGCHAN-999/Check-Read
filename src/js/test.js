jQuery.noConflict();
(async function ($, Swal10, PLUGIN_ID) {
	"use strict";
	let CONFIG = kintone.plugin.app.getConfig(PLUGIN_ID);

	// get field from kintone app.
	let GETFIELD = await kintone.api("/k/v1/preview/app/form/fields", "GET", {
		app: kintone.app.getId()
	});

	// get layout for get space from kintone app.
	let GETSPACE = await kintone.api("/k/v1/preview/app/form/layout.json", "GET", {
		app: kintone.app.getId()
	});

	// get space.
	let SPACE = GETSPACE.layout.reduce((setSpace, layoutFromApp) => {
		if (layoutFromApp.type === "GROUP") {
			layoutFromApp.layout.forEach(layoutItem => {
				layoutItem.fields.forEach(field => {
					if (field.type === "SPACER" && field.elementId) {
						setSpace.push({
							code: field.elementId
						});
					}
				});
			});
		} else {
			layoutFromApp.fields.forEach(field => {
				if (field.type === "SPACER" && field.elementId) {
					setSpace.push({
						code: field.elementId
					});
				}
			});
		}
		return setSpace;
	}, []);

	// sort space
	let SORTSPACE = SPACE.sort((a, b) => {
		return a.code.localeCompare(b.code);
	});

	// sort field.
	let FIELDFROMAPP = Object.values(GETFIELD.properties).sort((a, b) => {
		return a.code.localeCompare(b.code);
	});

	//function set value to config setting.
	async function setValueConfig() {
		return new Promise((resolve) => {
			FIELDFROMAPP.forEach((items) => {
				if (items.type == "DATE") {
					$("select#store_field").append(
						$("<option>").attr("value", items.code).attr("title", items.label).text(`${items.label}(${items.code}) `)
					);
					$("select#field_search").append(
						$("<option>").attr("value", items.code).attr("title", items.label).text(`${items.label}(${items.code}) `)
					);
				}
			});

			SORTSPACE.forEach((items) => {
				$("select#space").append(
					$("<option>").attr("value", items.code).text(`${items.code}`)
				);
			});
			resolve();
		});
	}

	// function get data from table.
	async function getData() {
		let formatSetting = $("#kintoneplugin-setting-tspace > tr:gt(0)").map(function () {
			let type = $(this).find("#type").val();
			let space = $(this).find("#space").val();
			let storeField = {
				code: $(this).find("#store_field").val(),
				label: $(this).find("#store_field option:selected").attr("title")
			}
			let format = $(this).find("#format").val();
			let initialValue = $(this).find("#initial_value").val();
			return { type, space, storeField, format, initialValue };
		}).get();
		let searchContent = $("#kintoneplugin-setting-search > tr:gt(0)").map(function () {
			let fieldSearch = {
				code: $(this).find("#field_search").val(),
				label: $(this).find("#field_search option:selected").attr("title")
			}
			let searchName = $(this).find("#search_name").val();
			return { fieldSearch, searchName };
		}).get();
		return {
			formatSetting,
			searchContent
		};
	}
// change
	async function setValueToTable(getConfig) {
		getConfig.formatSetting.forEach((item) => {
			let rowForClone = $("#kintoneplugin-setting-tspace tr:first-child").clone(true).removeAttr("hidden");
			$("#kintoneplugin-setting-tspace tr:last-child").after(rowForClone);
			rowForClone.find("#initial_value").val(item.initialValue);
				rowForClone.find("#type").val(item.type);
				rowForClone.find("#space").val(item.space);
				rowForClone.find("#store_field").val(item.storeField.code);
				rowForClone.find("#format").val(item.format);
		})
		//change
		getConfig.searchContent.forEach((item) => {
			let rowSearchContent = $("#kintoneplugin-setting-search tr:first-child").clone(true).removeAttr("hidden");
			$("#kintoneplugin-setting-search tr:last-child").after(rowSearchContent);
				rowSearchContent.find("#search_name").val(item.searchName);
				rowSearchContent.find("#field_search").val(item.fieldSearch.code);
		})
	}

	// setInitialValue function
	async function setInitialValue(status, setInitial) {
		let getConfig = {};
		if (status == "setInitial") {
			if (Object.keys(CONFIG).length === 0) {
				$("#kintoneplugin-setting-tspace tr:first-child").after(
					$("#kintoneplugin-setting-tspace tr:first-child").clone(true).removeAttr("hidden")
				)
				$("#kintoneplugin-setting-search tr:first-child").after(
					$("#kintoneplugin-setting-search tr:first-child").clone(true).removeAttr("hidden")
				)
				checkRow();
				return;
			} else {
				getConfig = JSON.parse(CONFIG.config);
				await setValueToTable(getConfig);
			}
		} else {
			$("#kintoneplugin-setting-tspace > tr:not(:first)").remove();
			$("#kintoneplugin-setting-search > tr:not(:first)").remove();
			getConfig = setInitial;
			await setValueToTable(getConfig);
		}
		checkRow();
	}

	// check row function.
	function checkRow() {
		const tablesId = [
			"#kintoneplugin-setting-tspace",
			"#kintoneplugin-setting-search",
		];
		$.each(tablesId, function (index, id) {
			let rows = $(id + " > tr");
			if (rows.length <= 2) {
				rows.find(".removeRow").hide();
			} else {
				rows.find(".removeRow").show();
			}
		});
	}

	// validate update function.
	async function validation() {
		let hasError = false;
		let errorMessage = "";
		let errorSearchContent = "";
		let storeFiledArray = [];
		let fieldSearchArray = [];
		let spaceArray = [];

		$('#kintoneplugin-setting-tspace > tr:gt(0)').each(function () {
			let type = $(this).find('#type');
			let space = $(this).find('#space');
			let storeField = $(this).find('#store_field');

			if (type.val() == "-----") {
				errorMessage += `<p>Please select a type.</p>`;
				$(type).parent().addClass('validation-error');
				hasError = true;
			} else {
				$(type).parent().removeClass('validation-error');
			}

			if (space.val() && spaceArray.includes(space.val().trim())) {
				errorMessage += `<p>Cannot select the same space</p>`;
				$(space).parent().addClass('validation-error');
				hasError = true;
			} else {
				$(space).parent().removeClass('validation-error');
				spaceArray.push(space.val());
			}

			if (storeField.val() == "-----") {
				errorMessage += `<p>Select the storage field.</p>`;
				$(storeField).parent().addClass('validation-error');
				hasError = true;
			} else if (storeFiledArray.includes(storeField.val().trim())) {
				errorMessage += `<p>The field to be searched ${storeField.val()} already exists.</p>`;
				$(storeField).parent().addClass('validation-error');
				hasError = true;
			} else {
				$(storeField).parent().removeClass('validation-error');
				storeFiledArray.push(storeField.val());
			}
		});

		$('#kintoneplugin-setting-search > tr:gt(0)').each(function () {
			let searchName = $(this).find('#search_name');
			let fieldSearch = $(this).find('#field_search');

			if (searchName.val() == "") {
				errorSearchContent += `<p>Search name cannot be empty</p>`;
				$(searchName).addClass('validation-error');
				hasError = true;
			} else if (fieldSearchArray.includes(searchName.val().trim())) {
				errorSearchContent += `<p>The search name ${searchName.val()} already exists.</p>`;
				$(searchName).addClass('validation-error');
				hasError = true;
			} else {
				$(searchName).removeClass('validation-error');
				fieldSearchArray.push(searchName.val());
			}

			if (fieldSearch.val() == "-----") {
				errorSearchContent += `<p>Please select a type field for search</p>`;
				$(fieldSearch).parent().addClass('validation-error');
				hasError = true;
			} else if (fieldSearchArray.includes(fieldSearch.val().trim())) {
				errorSearchContent += `<p>The field for search ${fieldSearch.val()} already exists.</p>`;
				$(fieldSearch).parent().addClass('validation-error');
				hasError = true;
			} else {
				$(fieldSearch).parent().removeClass('validation-error');
				fieldSearchArray.push(fieldSearch.val());
			}
		});

		if (errorMessage) errorMessage = "<p>【Date format settings】</p>" + errorMessage;
		if (errorSearchContent) errorSearchContent = "<p>【Search Content】</p>" + errorSearchContent;
		if (hasError) Swal10.fire({
			position: 'center',
			icon: 'error',
			html: errorMessage + errorSearchContent,
			showConfirmButton: true,
		});
		return hasError;
	}

	//function start when open the plugin.
	$(document).ready(function () {
		window.RsComAPI.showSpinner();
		setValueConfig().then(() => {
			return setInitialValue('setInitial');
		}).then(() => {
			window.RsComAPI.hideSpinner();
		});

		$('#kintoneplugin-setting-tspace,#kintoneplugin-setting-search').sortable({
			handle: '.drag-icon',
			items: 'tr:not([hidden])', 
			cursor: 'move',
			placeholder: 'ui-state-highlight',
			axis: 'y'
		});

		$('input#initial_value').on('input', function () {
			$(this).val($(this).val().replace(/[^0-9-]/g, ''));
		})

		//japan
		$('input#search_name').on('input', function () {
			let currentValue = $(this).val();
			currentValue = currentValue.replace(/[^\u3000-\u303F\u3040-\u309F\u30A0-\u30FF\uFF00-\uFFEFa-zA-Z0-9\s]/g, '');
			currentValue = currentValue.replace(/\s{2,}/g, ' ');
			$(this).val(currentValue);
		});
		
		// button save.
		$('#button_save').on('click', async function () {
			let createConfig = await getData();
			let hasError = await validation("save", createConfig);
			if (hasError) return;
			let config = JSON.stringify(createConfig);
			kintone.plugin.app.setConfig({ config }, () => {
				window.location.href = `../../flow?app=${kintone.app.getId()}#section=settings`;
			});
		});

		//cancel button
		$(".cancel").on('click', async function () {
			Swal10.fire({
				position: "center",
				icon: "info",
				text: "Do you want to finish setting up the plugin?",
				confirmButtonColor: "#3498db",
				showCancelButton: true,
				cancelButtonColor: "#f7f9fa",
				confirmButtonText: "OK",
				cancelButtonText: "Cancel",
				customClass: {
					confirmButton: 'custom-confirm-button',
					cancelButton: 'custom-cancel-button'
				}
			}).then((result) => {
				if (result.isConfirmed) {
					window.location.href = "../../" + kintone.app.getId() + "/plugin/";
				}
			});
		});

		//add new row function
		$(".addRow").on('click', function () {
			let closestTable = $(this).closest("table");
			let closestTbody = $(this).closest("tbody");
			let clonedRow = closestTbody.find("tr").first().clone(true).removeAttr("hidden");
			if (closestTable.is("#kintoneplugin-setting-body"));
			$(this).closest("tr").after(clonedRow);
			checkRow();
		});

		//remove row function
		$(".removeRow").on('click', function () {
			$(this).closest("tr").remove();
			checkRow();
		});

		// Export function
		$("#Export").on('click', async function () {
			Swal10.fire({
				customClass: {
					confirmButton: 'custom-confirm-button',
					cancelButton: 'custom-cancel-button'
				},
				position: "center",
				icon: "info",
				text: "Do you want to export configuration information?",
				confirmButtonColor: "#3498db",
				showCancelButton: true,
				cancelButtonColor: "#f7f9fa",
				confirmButtonText: "OK",
				cancelButtonText: "Cancel",
			}).then(async (result) => {
				if (result.isConfirmed) {
					let hasError = await validation("export", await getData());
					if (hasError) return;
					let data = await getData();
					let blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
					let url = URL.createObjectURL(blob);
					let date = new Date();
					let year = date.getFullYear();
					let month = ('0' + (date.getMonth() + 1)).slice(-2);
					let day = ('0' + date.getDate()).slice(-2);
					let hours = ('0' + date.getHours()).slice(-2);
					let minutes = ('0' + date.getMinutes()).slice(-2);
					let formattedDateTime = `${year}-${month}-${day} ${hours}-${minutes}.json`;
					let elementDownload = $('<a>')
						.attr('href', url)
						.attr('download', formattedDateTime)
						.appendTo('body');
					elementDownload[0].click();
					elementDownload.remove();
				};
			});
		});

		// Import function
		$("#Import").on('click', function () {
			$("#fileInput").click();
		});
		$("#fileInput").on('change', function (event) {
			let file = event.target.files[0];
			if (file) {
				let reader = new FileReader();
				reader.onload = async (e) => {
					let fileContent = e.target.result;
					let dataImport;
					try {
						dataImport = JSON.parse(fileContent);
					} catch (error) {
						let customClass = $("<div></div>")
							.html(`The file format of the configuration information for reading is JSON format.<br> Please check the file format extension.`)
							.css("font-size", "14px");
						await Swal10.fire({
							icon: "error",
							html: customClass.prop("outerHTML"),
							confirmButtonColor: "#3498db",
						});

						$("#fileInput").val('');
						return;
					}

					let checkCompareConfig = await compareConfigStructures(dataImport);
					if (!checkCompareConfig) {
						$("#fileInput").val('');
						return;
					} else {
						await setInitialValue('import', dataImport);
						Swal10.fire({
							position: 'center',
							icon: 'success',
							text: 'Configuration information loaded successfully.',
							showConfirmButton: true,
						});
						$("#fileInput").val('');
					}
				};
				reader.readAsText(file);
			}
		});

		// function check structure and data import
		async function compareConfigStructures(dataImport) {
			let configStructure = {
				formatSetting: [
					{
						type: "string",
						space: "string",
						storeField: {
							code: "string",
							label: "string",
						},
						format: "string",
						initialValue: "string"
					}
				],
				searchContent: [
					{
						fieldSearch: {
							code: "string",
							label: "string",
						},
						searchName: "string"
					}
				]
			}

			function checkType(configStructure, dataImport) {
				if (Array.isArray(configStructure)) {
					if (!Array.isArray(dataImport)) {
						return false;
					}
					for (let item of dataImport) {
						if (!checkType(configStructure[0], item)) {
							return false;
						}
					}
					return true;
				}

				if (typeof configStructure === 'object' && !Array.isArray(configStructure)) {
					if (typeof dataImport !== 'object' || Array.isArray(dataImport)) {
						return false;
					}
					for (let key in configStructure) {
						if (!(key in dataImport)) {
							return false;
						}
						if (!checkType(configStructure[key], dataImport[key])) {
							return false;
						}
					}
					for (let key in dataImport) {
						if (!(key in configStructure)) {
							return false;
						}
					}
					return true;
				}
				return true;
			}

			function checkAllCases(dataImport) {
				if (Object.keys(dataImport).length === 0) {
					return false;
				}
				if (!checkType(configStructure, dataImport)) {
					return false;
				}
				return true;
			}

			let isValid = checkAllCases(dataImport);
			if (!isValid) {
				let customClass = $("<div></div>")
					.text("Failed to load configuration information.")
					.css("font-size", "18px");
				await Swal10.fire({
					icon: "error",
					html: customClass.prop("outerHTML"),
					confirmButtonColor: "#3498db",
				});
				return false;
			}
			return true;
		}
	});
})(jQuery, Sweetalert2_10.noConflict(true), kintone.$PLUGIN_ID);


jQuery.noConflict();
(async function ($, PLUGIN_ID) {
  "use strict";
  let CONFIG = kintone.plugin.app.getConfig(PLUGIN_ID);
  let GETFIELD = await kintone.api("/k/v1/preview/app/form/fields", "GET", {
    app: kintone.app.getId(),
  });
  // function get data from table.
  async function groupData() {
    let groupSetting = $("#kintoneplugin-setting-tspace > tr:gt(0)")
      .map(function () {
        return {
          nameMarker: $(this).find("#name_marker").val(),
          groupName: $(this).find("#group_name").val(),
          searchLength: $(this).find("#search_length").val(),
          searchType: {
            value: $(this).find("#search_type").val(),
            type: $(this).find("#search_type option:selected").attr("type"),
          },
        };
      })
      .get();

    let searchContent = $("#kintoneplugin-setting-prompt-template > tr:gt(0)")
      .map(function () {
        return {
          groupName: $(this).find("#group_name_ref").val(),
          searchName: $(this).find("#search_name").val(),
          searchTarget: {
            code: $(this).find("#search_target").val(),
            type: $(this).find("#search_target option:selected").attr("type"),
          },
          fieldForSearch: $(this).find("#field_for_search").val(),
        };
      })
      .get();

    let colorSetting = {
      titleColor: $("#title-color").val(),
      buttonColor: $("#button-color").val(),
      buttonTextColor: $("#button-text-color").val(),
    };
    return {
      groupSetting,
      searchContent,
      colorSetting,
    };
  }

  $(
    "#kintone-plugin-setting-body tbody, #container_row, #container_groupForms"
  ).sortable({
    handle: ".drag_and_drop_icon",
    items: "tr:not([hidden])",
    cursor: "move",
    placeholder: "ui-state-highlight",
    axis: "y",
  });

  setupTableControls();
  function setupTableControls() {
    setupSortableTables();
  }

  function setupSortableTables() {
    const tables = [
      "#kintoneplugin-setting-body tbody",
      "#container_row",
      "#container_groupForms",
    ];

    tables.forEach((tableId) => {
      $(tableId).sortable({
        handle: ".drag-icon",
        items: "tr:not([hidden])",
        cursor: "move",
        placeholder: "ui-state-highlight",
        axis: "y",
      });
    });
  }

  async function setValueToTable(getConfig) {
    getConfig.groupSetting.forEach((item) => {
      let rowForClone = $("#kintoneplugin-setting-tspace tr:first-child")
        .clone(true)
        .removeAttr("hidden");
      $("#kintoneplugin-setting-tspace tr:last-child").after(rowForClone);
      rowForClone.find("#name_marker").val(item.nameMarker);
      rowForClone.find("#group_name").val(item.groupName);
      rowForClone.find("#search_length").val(item.searchLength);
      rowForClone.find("#search_type").val(item.searchType.value);
    });

    await updateData("initial");

    getConfig.searchContent.forEach((item) => {
      let rowForClone = $(
        "#kintoneplugin-setting-prompt-template tr:first-child"
      )
        .clone(true)
        .removeAttr("hidden");
      $("#kintoneplugin-setting-prompt-template tr:last-child").after(
        rowForClone
      );
      rowForClone.find("#search_name").val(item.searchName);

      if (
        $(rowForClone).find(
          'select#group_name_ref option[value="' + item.groupName + '"]'
        ).length == 0
      ) {
        rowForClone.find("#group_name_ref").val("-----");
      } else {
        rowForClone.find("#group_name_ref").val(item.groupName);
      }

      if (
        $(rowForClone).find(
          'select#search_target option[value="' + item.searchTarget.code + '"]'
        ).length == 0
      ) {
        rowForClone.find("#search_target").val("-----");
      } else {
        rowForClone.find("#search_target").val(item.searchTarget.code);
      }

      if (
        $(rowForClone).find(
          'select#field_for_search option[value="' + item.fieldForSearch + '"]'
        ).length == 0
      ) {
        rowForClone.find("#field_for_search").val("-----");
      } else {
        rowForClone.find("#field_for_search").val(item.fieldForSearch);
      }
    });

    //set color
    $("#title-color")
      .val(getConfig.colorSetting.titleColor)
      .css("color", getConfig.colorSetting.titleColor);
    $("#button-color")
      .val(getConfig.colorSetting.buttonColor)
      .css("color", getConfig.colorSetting.buttonColor);
    $("#button-text-color")
      .val(getConfig.colorSetting.buttonTextColor)
      .css("color", getConfig.colorSetting.buttonTextColor);
  }

  // sort field.
  let FIELDFROMAPP = Object.values(GETFIELD.properties).sort((a, b) => {
    return a.code.localeCompare(b.code);
  });

  //function set value to config setting.
  async function setValueConfig() {
    return new Promise((resolve) => {
      const fieldType = [
        "SINGLE_LINE_TEXT",
        "MULTI_LINE_TEXT",
        "NUMBER",
        "CALC",
        "CHECK_BOX",
        "RADIO_BUTTON",
        "DROP_DOWN",
        "DATE",
        "DATETIME",
      ];
      FIELDFROMAPP.forEach((items) => {
        if (fieldType.includes(items.type)) {
          $("select#search_target").append(
            $("<option>")
              .attr("value", items.code)
              .attr("type", items.type)
              .text(`${items.label}(${items.code}) `)
          );
          if (
            items.type === "SINGLE_LINE_TEXT" ||
            items.type === "MULTI_LINE_TEXT"
          ) {
            $("select#field_for_search").append(
              $("<option>")
                .attr("value", items.code)
                .text(`${items.label}(${items.code}) `)
            );
          }
        }
      });
      resolve();
    });
  }

  // setInitialValue function
  async function setInitialValue(status, setInitial) {
    let getConfig = {};
    if (status == "setInitial") {
      if (Object.keys(CONFIG).length === 0) {
        $("#kintoneplugin-setting-prompt-template tr:first-child").after(
          $("#kintoneplugin-setting-prompt-template tr:first-child")
            .clone(true)
            .removeAttr("hidden")
        );
        $("#kintoneplugin-setting-code-master tr:first-child").after(
          $("#kintoneplugin-setting-code-master tr:first-child")
            .clone(true)
            .removeAttr("hidden")
        );
        $("#kintoneplugin-setting-tspace tr:first-child").after(
          $("#kintoneplugin-setting-tspace tr:first-child")
            .clone(true)
            .removeAttr("hidden")
        );
        checkRow();
      } else {
        getConfig = JSON.parse(CONFIG.config);
        await setValueToTable(getConfig);
      }
    } else {
      $("#kintoneplugin-setting-tspace > tr:not(:first)").remove();
      $("#kintoneplugin-setting-code-master > tr:not(:first)").remove();
      $("#kintoneplugin-setting-prompt-template > tr:not(:first)").remove();
      // HASUPDATED = false;
      getConfig = setInitial;

      await setValueToTable(getConfig);
    }
    checkRecreateButton();
  }

  //check recreate button
  function checkRecreateButton() {
    $("#kintoneplugin-setting-prompt-template > tr:gt(0)").each(function () {
      let fieldForSearch = $(this).find("#field_for_search");
      if (fieldForSearch.val() == "-----") {
        $(this).find("#recreate-button").hide();
      } else {
        $(this).find("#recreate-button").show();
      }
    });
  }

  // check row button
  function checkRow() {
    $.each(function () {
      let addRow = $("addRow");
      if (addRow.length <= 1) {
        addRow.find(".removeRow").hide();
      } else {
        addRow.find(".removeRow").show();
      }
    });
  }

  async function updateData(condition) {
    const getValueUpdated = await groupData();
    let currentRow = $(this).closest("tr");

    for (const item of getValueUpdated.groupSetting) {
      console.log(item);
      if (!item.groupName) {
        $(currentRow)
          .find("select#group_name")
          .parent()
          .addClass("validation-error");
        await Swal.fire({
          position: "center",
          icon: "error",
          text: "Please add group name!",
          showConfirmButton: true,
        });
        return;
      }

      if (item.searchType.value === "-----") {
        $(currentRow)
          .find("select#search_type")
          .parent()
          .addClass("validation-error");
        await Swal.fire({
          position: "center",
          icon: "error",
          text: "Please add Search type!",
          showConfirmButton: true,
        });
        return;
      }
    }

    const rows = $("#kintoneplugin-setting-prompt-template > tr");
    rows.each(function () {
      const row = $(this);
      const select = row.find("#group_name_ref");
      const selectedGroupName = select.val();

      select.empty().append($("<option>").val("-----").text("-----"));

      getValueUpdated.groupSetting.forEach((item) => {
        if (item.groupName) {
          select.append($("<option>").val(item.groupName).text(item.groupName));
        }
      });

      select.val(selectedGroupName);
    });

    if (condition) return;
    return await Swal.fire({
      position: "center",
      icon: "success",
      text: "Update Successful",
      showConfirmButton: true,
    });
  }

  $("#button-update").click(async function () {
    const $button = $(this);
    $button.prop("disabled", true);
    try {
      await updateData();
    } finally {
      $button.prop("disabled", false);
    }
  });

  // Color picker
  const defaultColorPickerConfig = {
    opacity: false,
    doRender: false,
    buildCallback: function ($elm) {
      $elm.addClass("kintone-ui");

      const colorInstance = this.color;
      const colorPicker = this;

      $elm
        .prepend(
          '<div class="cp-panel">' +
            '<div><label>R</label> <input type="number" max="255" min="0" class="cp-r" /></div>' +
            '<div><label>G</label> <input type="number" max="255" min="0" class="cp-g" /></div>' +
            '<div><label>B</label> <input type="number" max="255" min="0" class="cp-b" /></div>' +
            "<hr>" +
            '<div><label>H</label> <input type="number" max="360" min="0" class="cp-h" /></div>' +
            '<div><label>S</label> <input type="number" max="100" min="0" class="cp-s" /></div>' +
            '<div><label>V</label> <input type="number" max="100" min="0" class="cp-v" /></div>' +
            "</div>"
        )
        .on("change", "input", function (e) {
          const value = this.value,
            className = this.className,
            type = className.split("-")[1],
            color = {};

          color[type] = value;
          colorInstance.setColor(
            type === "HEX" ? value : color,
            type === "HEX" ? "HEX" : /(?:r|g|b)/.test(type) ? "rgb" : "hsv"
          );
          colorPicker.render();
        });

      const buttons = $elm.append(
        '<div class="cp-disp">' +
          '<button type="button" id="cp-submit">OK</button>' +
          '<button type="button" id="cp-cancel">Cancel</button>' +
          "</div>"
      );

      buttons.on("click", "#cp-submit", (e) => {
        const colorCode = "#" + colorPicker.color.colors.HEX;

        $elm.css("border-bottom-color", colorCode);
        $elm.attr("value", colorCode);

        const $el = colorPicker.$trigger
          .parent("div")
          .find('input[type="text"]');
        $el.val(colorCode);
        $el.css("color", colorCode);

        colorPicker.$trigger.css("border-bottom-color", colorCode);
        colorPicker.toggle(false);
      });

      buttons.on("click", "#cp-cancel", (e) => {
        colorPicker.toggle(false);
      });
    },
    renderCallback: function ($elm, toggled) {
      const colors = this.color.colors.RND;
      const colorCode = "#" + this.color.colors.HEX;

      const modes = {
        r: colors.rgb.r,
        g: colors.rgb.g,
        b: colors.rgb.b,
        h: colors.hsv.h,
        s: colors.hsv.s,
        v: colors.hsv.v,
        HEX: colorCode,
      };

      $("input", ".cp-panel").each(function () {
        this.value = modes[this.className.substr(3)];
      });

      this.$trigger = $elm;
    },
    positionCallback: function ($elm) {
      this.color.setColor($elm.attr("value"));
    },
  };

  //start setting plugin
  $(document).ready(function () {
    window.RsComAPI.showSpinner();
    setValueConfig()
      .then(() => {
        return setInitialValue("setInitial");
      })
      .then(() => {
        window.RsComAPI.hideSpinner();
      });
    // Color Picker
    const colorPickerTitle = $("#font-color-picker-title-icon").colorPicker(
      defaultColorPickerConfig
    );
    const colorPickerButton = $("#bg-color-picker-button-icon").colorPicker(
      defaultColorPickerConfig
    );
    const colorPickerButtonText = $(
      "#font-color-picker-button-text-icon"
    ).colorPicker(defaultColorPickerConfig);

    $(document).keyup((event) => {
      const TAB_KEY_CODE = 9;
      const ENTER_KEY_CODE = 13;
      const ESC_KEY_CODE = 27;
      if (
        event.keyCode === TAB_KEY_CODE ||
        event.keyCode === ENTER_KEY_CODE ||
        event.keyCode === ESC_KEY_CODE
      ) {
        colorPickerTitle.colorPicker.toggle(false);
        colorPickerButton.colorPicker.toggle(false);
        colorPickerButtonText.colorPicker.toggle(false);
      }
    });

    //add new row
    $(".addRow").on("click", function () {
      let closestTbody = $(this).closest("tbody");
      let clonedRow = closestTbody
        .find("tr")
        .first()
        .clone(true)
        .removeAttr("hidden");
      $(this).closest("tr").after(clonedRow);
      checkRow();
      checkRecreateButton();
    });

    //remove row
    $(".removeRow").on("click", function () {
      $(this).closest("tr").remove();
      checkRow();
    });

    //check row
    function checkRow() {
      const tableIds = [
        "#kintoneplugin-setting-tspace",
        "#kintoneplugin-setting-prompt-template",
      ];

      tableIds.forEach((id) => {
        const $rows = $(`${id} > tr`);
        const shouldHide = $rows.length <= 2;
        $rows.find(".removeRow").toggle(!shouldHide);
      });
    }

    // Set color when input text change
    $("#title-color").change(function () {
      $(this).css("color", $(this).val());
    });
    $("#button-color").change(function () {
      $(this).css("color", $(this).val());
    });
    $("#button-text-color").change(function () {
      $(this).css("color", $(this).val());
    });

    $(
      "#kintoneplugin-setting-body tbody, #kintoneplugin-setting-code-master, #kintoneplugin-setting-tspace"
    ).sortable({
      handle: ".drag-icon",
      items: "tr:not([hidden])",
      cursor: "move",
      placeholder: "ui-state-highlight",
      axis: "y",
    });

    // button save.
    $("#button_save").on("click", async function () {
      let createConfig = await groupData();
      createConfig.searchContent.forEach((item) => {
        console.log(item);
        if (item.searchName === "") {
          return Swal.fire({
            position: "center",
            icon: "error",
            text: "Please add search name!",
            showConfirmButton: true,
          });
        }
        if (item.searchTarget.code === "-----") {
          return Swal.fire({
            position: "center",
            icon: "error",
            text: "Please add search target Field!",
            showConfirmButton: true,
          });
        }
        let config = JSON.stringify(createConfig);
        kintone.plugin.app.setConfig({ config }, () => {
          console.log("Save successful");
          window.location.href = `../../flow?app=${kintone.app.getId()}#section=settings`;
        });
      });
    });

    $("button#recreate-button").on("click", async function () {
      let data = await groupData();
      let currentRow = $(this).closest("tr");
      let targetField = $(currentRow).find("select#search_target").val();
      let groupName = $(currentRow).find("select#group_name_ref").val();
      //check group name and target field
      if (groupName == "-----" && targetField == "-----") {
        $(currentRow)
          .find("select#group_name_ref")
          .parent()
          .addClass("validation-error");
        $(currentRow)
          .find("select#search_target")
          .parent()
          .addClass("validation-error");
        return Swal.fire({
          position: "center",
          icon: "error",
          text: "Please select group name and select field",
          showConfirmButton: true,
        });
      } else {
        $(currentRow)
          .find("select#group_name_ref")
          .parent()
          .removeClass("validation-error");
        $(currentRow)
          .find("select#search_target")
          .parent()
          .removeClass("validation-error");
      }

      //check group name
      if (groupName == "-----") {
        $(currentRow)
          .find("select#group_name_ref")
          .parent()
          .addClass("validation-error");
        return Swal.fire({
          position: "center",
          icon: "error",
          text: "Please select group",
          showConfirmButton: true,
        });
      } else {
        $(currentRow)
          .find("select#group_name_ref")
          .parent()
          .removeClass("validation-error");
        let currentGroup = data.groupSetting.filter(
          (item) => item.groupName == groupName
        );
        let searchType = currentGroup[0].searchType.value;
        if (searchType !== "initial" && searchType !== "patial") {
          return Swal.fire({
            position: "center",
            icon: "error",
            text: "Please select search type",
            showConfirmButton: true,
          });
        }
      }

      //check target field
      if (targetField == "-----") {
        $(currentRow)
          .find("select#search_target")
          .parent()
          .addClass("validation-error");
        return Swal.fire({
          position: "center",
          icon: "error",
          text: "Please select Search target field.",
          showConfirmButton: true,
        });
      } else {
        $(currentRow)
          .find("select#search_target")
          .parent()
          .removeClass("validation-error");
        let fieldType = $(currentRow)
          .find("select#search_target option:selected")
          .attr("type");
        if (fieldType == "SINGLE_LINE_TEXT" || fieldType == "MULTI_LINE_TEXT") {
          $(currentRow)
            .find("select#search_target")
            .parent()
            .removeClass("validation-error");
        } else {
          $(currentRow)
            .find("select#search_target")
            .parent()
            .addClass("validation-error");
          return Swal.fire({
            position: "center",
            icon: "error",
            text: "Searchable field types cannot be recreated.",
            showConfirmButton: true,
          });
        }
      }

      window.RsComAPI.showSpinner();
      let fieldForSearch = $(currentRow).find("select#field_for_search").val();
      let latestValue = await groupData();
      let records = await window.RsComAPI.getRecords({
        app: kintone.app.getId(),
      });

      let getGroupData = latestValue.groupSetting.filter(
        (item) => item.groupName == groupName
      );

      let updateRecords = [];
      for (let record of records) {
        let targetValue = record[targetField].value;
        if (targetValue == "" || targetField == undefined) continue;
        let convertedValue = "";

        switch (getGroupData[0].searchType.value) {
          case "initial":
            convertedValue = `_,${targetValue.split("").join(",")}`;
            break;

          case "patial":
            convertedValue = `${targetValue.split("").join(",")}`;
            break;

          default:
            break;
        }

        record[fieldForSearch].value = convertedValue;
        updateRecords.push({
          id: record.$id.value,
          record: {
            [fieldForSearch]: {
              value: convertedValue,
            },
          },
        });
      }
      let body = {
        app: kintone.app.getId(),
        records: updateRecords,
      };
      try {
        await kintone.api(
          kintone.api.url("/k/v1/records.json", true),
          "PUT",
          body
        );
        Swal.fire({
          position: "center",
          icon: "success",
          text: "Recreate Successful",
          showConfirmButton: true,
        });
      } catch (error) {
        Swal.fire({
          position: "center",
          icon: "error",
          text: error.message,
          showConfirmButton: true,
        });
      }
      window.RsComAPI.hideSpinner();
    });

    $("#cancel").on("click", async function () {
      Swal.fire({
        position: "center",
        icon: "info",
        text: "Do you want to cancel?",
        confirmButtonColor: "#3498db",
        showCancelButton: true,
        cancelButtonColor: "#f7f9fa",
        confirmButtonText: "OK",
        customClass: {
          confirmButton: "custom-confirm-button",
          cancelButton: "custom-cancel-button",
        },
      }).then((result) => {
        if (result.isConfirmed) {
          window.location.href = "../../" + kintone.app.getId() + "/plugin/";
        }
      });
    });

    //hide and show recreate button
    $("select#field_for_search").on("change", (e) => {
      let currentRow = $(e.target).closest("tr");
      if (e.target.value == "-----") {
        $(currentRow).find("button#recreate-button").hide();
      } else {
        $(currentRow).find("button#recreate-button").show();
      }
    });
  });
})(jQuery, kintone.$PLUGIN_ID);