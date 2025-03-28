jQuery.noConflict();

(async function ($, Swal10, PLUGIN_ID) {
  "use strict";

  class KintoneConfigManager {
    constructor() {
      this.$form = $(".box_container");
      this.appId = kintone.app.getId();
      this.apiEndpointLayout = kintone.api.url("/k/v1/preview/app/form/layout.json", true);
    }

    async init() {
      await this.setupFormFields();
      this.loadDefaultConfig();
      this.attachEventListeners();
      this.eventOnchangeColor();
      this.eventOnchangeCheckInput();
    }

    async setupFormFields() {
      // Get layout for space fields
      const GETSPACE = await new Promise((resolve, reject) => {
        kintone.api(
          this.apiEndpointLayout,
          "GET",
          { app: this.appId },
          resolve,
          reject
        );
      });

      // Extract space fields
      const SPACE = GETSPACE.layout.reduce((setSpace, layoutFromApp) => {
        layoutFromApp.fields.forEach(field => {
          if (field.type === "SPACER" && field.elementId) {
            setSpace.push({
              code: field.elementId
            });
          }
        });
        return setSpace;
      }, []);

      // Sort space fields
      const SORTSPACE = SPACE.sort((a, b) => {
        return a.code.localeCompare(b.code);
      });

      // Populate the display_location dropdown
      const $displayLocation = $("#display_location");
      SORTSPACE.forEach((space) => {
        $displayLocation.append(
          $("<option>")
            .attr("value", space.code)
            .text(space.code)
        );
      });
    }

    eventOnchangeCheckInput(){
      $("#read_db_app_id").on("change", function () {
        $(this).css("border-color", "");
      });
      $("#read_db_app_api_token").on("change", function () {
        $(this).css("border-color", "");
      });
      $("#read_count_display_text").on("change", function () {
        $(this).css("border-color", "");
      });
    }

    async loadDefaultConfig() {
      const config = kintone.plugin.app.getConfig(PLUGIN_ID);
      const savedConfig = JSON.parse(config.config);
      const configData = savedConfig;
      $("#read_db_app_id").val(configData.read_db_app_id || "");
      $("#read_db_app_api_token").val(configData.read_db_app_api_token || "");
      $("#display_location").val(configData.display_location || "");
      $("#read_count_display_text").val(configData.read_count_display_text || "Read:{%Number%}");
      $("#reset_read_data").prop("checked", !!configData.reset_read_data);
      $("#unread-text-color").val(configData.unread_text_color || "").css("color", configData.unread_text_color);
      $("#unread-bg-color").val(configData.unread_bg_color || "").css("color", configData.unread_bg_color);
      $("#read-text-color").val(configData.read_text_color || "").css("color", configData.read_text_color);
      $("#read-bg-color").val(configData.read_bg_color || "").css("color", configData.read_bg_color);
    }

    eventOnchangeColor() {
      $("#unread-text-color").on("change", function () {
        $(this).css("color", $(this).val());
      });
      $("#unread-bg-color").on("change", function () {
        $(this).css("color", $(this).val());
      });
      $("#read-text-color").on("change", function () {
        $(this).css("color", $(this).val());
      });
      $("#read-bg-color").on("change", function () {
        $(this).css("color", $(this).val());
      });
    }

    attachEventListeners() {
      this.$form.on("submit", (e) => this.handleSubmit(e));
    }

    handleSubmit(e) {
      e.preventDefault();
      const configData = {
        read_db_app_id: $("#read_db_app_id").val(),
        read_db_app_api_token: $("#read_db_app_api_token").val(),
        display_location: $("#display_location").val(),
        read_count_display_text: $("#read_count_display_text").val(),
        reset_read_data: $("#reset_read_data").is(":checked"),
        unread_text_color: $("#unread-text-color").val(),
        unread_bg_color: $("#unread-bg-color").val(),
        read_text_color: $("#read-text-color").val(),
        read_bg_color: $("#read-bg-color").val(),
      };

      let isValid = true;
      if (!configData.read_db_app_id) {
        isValid = false;
        Swal10.fire({
          position: 'center',
          icon: 'error',
          text: 'Please enter the Read DB App ID.',
          showConfirmButton: true,
        });
        $("#read_db_app_id").css("border-color", "red");
      } else if (!configData.read_db_app_api_token) {
        isValid = false;
        Swal10.fire({
          position: 'center',
          icon: 'error',
          text: 'Please enter the Read DB App API Token.',
          showConfirmButton: true,
        });
        $("#read_db_app_api_token").css("border-color", "red");
      } else if (!configData.read_count_display_text) {
        isValid = false;
        Swal10.fire({
          position: 'center',
          icon: 'error',
          text: 'Please enter the Read Count Display Text.',
          showConfirmButton: true,
        });
        $("#read_count_display_text").css("border-color", "red");
      }
      if (!isValid) return;

      kintone.plugin.app.setConfig({ config: JSON.stringify(configData) }, () => {
        window.location.href = `../../flow?app=${kintone.app.getId()}#section=settings`;
      });
    }
  }

  // Color picker config
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
        .on("change", "input", function () {
          const value = this.value;
          const className = this.className;
          const type = className.split("-")[1];
          const color = {};

          color[type] = value;
          colorInstance.setColor(
            type === "HEX" ? value : color,
            type === "HEX" ? "HEX" : /(?:r|g|b)/.test(type) ? "rgb" : "hsv"
          );
          colorPicker.render();
        });

      const $buttons = $elm.append(
        '<div class="cp-disp">' +
        '<button type="button" id="cp-submit">OK</button>' +
        '<button type="button" id="cp-cancel">Cancel</button>' +
        "</div>"
      );

      $buttons.on("click", "#cp-submit", () => {
        const colorCode = "#" + colorPicker.color.colors.HEX;
        $elm.css("border-bottom-color", colorCode);
        $elm.attr("value", colorCode);

        const $input = colorPicker.$trigger.parent("div").find('input[type="text"]');
        $input.val(colorCode).css("color", colorCode);
        colorPicker.$trigger.css("border-bottom-color", colorCode);
        colorPicker.toggle(false);
      });

      $buttons.on("click", "#cp-cancel", () => colorPicker.toggle(false));
    },
    renderCallback: function ($elm) {
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

      $(".cp-panel input", $elm).each(function () {
        this.value = modes[this.className.substr(3)];
      });

      this.$trigger = $elm;
    },
    positionCallback: function ($elm) {
      this.color.setColor($elm.attr("value"));
    },
  };

  $(document).ready(() => {
    // Initialize color pickers
    const unread_text_color = $("#unread-text-color-icon").colorPicker(defaultColorPickerConfig);
    const unread_bg_color = $("#unread-bg-color-icon").colorPicker(defaultColorPickerConfig);
    const read_text_color = $("#read-text-color-icon").colorPicker(defaultColorPickerConfig);
    const read_bg_color = $("#read-bg-color-icon").colorPicker(defaultColorPickerConfig);

    $(document).keyup((event) => {
      const TAB_KEY_CODE = 9;
      const ENTER_KEY_CODE = 13;
      const ESC_KEY_CODE = 27;
      if ([TAB_KEY_CODE, ENTER_KEY_CODE, ESC_KEY_CODE].includes(event.keyCode)) {
        unread_text_color.colorPicker.toggle(false);
        unread_bg_color.colorPicker.toggle(false);
        read_text_color.colorPicker.toggle(false);
        read_bg_color.colorPicker.toggle(false);
      }
    });
    const configManager = new KintoneConfigManager();
    configManager.init();
  });
})(jQuery, Sweetalert2_10.noConflict(true), kintone.$PLUGIN_ID);