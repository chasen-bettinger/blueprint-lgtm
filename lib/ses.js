// Generated by CoffeeScript 1.9.2
(function() {
  var AWS, Promise, SES, _;

  Promise = require('bluebird');

  AWS = require('aws-sdk');

  _ = require('lodash');

  SES = (function() {
    SES.deps = {
      services: ['logger', 'template', 'config'],
      config: 'ses[accessKeyId,secretAccessKey,region,emails[],debug_email,default{}]'
    };

    function SES(kit) {
      this.log = kit.services.logger.log;
      this.config = kit.services.config.ses;
      AWS.config.update({
        accessKeyId: this.config.accessKeyId,
        secretAccessKey: this.config.secretAccessKey,
        region: this.config.region
      });
      this.ses = new AWS.SES();
      this.template = kit.services.template;
      this.sendEmailAsPromised = Promise.promisify(this.ses.sendEmail, {
        context: this.ses
      });
    }

    SES.prototype.send = function(type, data) {
      var message, spec;
      spec = this.config.emails[type];
      message = this._composeMsgFrom(spec, data);
      this.log.debug('SES:send:', 'sending message:', message);
      return this.sendEmailAsPromised(message);
    };

    SES.prototype._composeMsgFrom = function(spec, data) {
      var eml_attributes, f, recipient, ref, ref1, ref2, ref3, ref4, ref5, ref6, send_to;
      f = 'SES._composeMsgFrom:';
      this.log.debug(f, spec, data);
      eml_attributes = _.merge({}, spec, data);
      send_to = false;
      if (this.config.debug_email !== false) {
        send_to = this.config.debug_email;
      } else {
        recipient = eml_attributes.Recipient[0];
        send_to = typeof recipient === 'string' ? recipient : recipient.eml;
      }
      return {
        Destination: {
          ToAddresses: [send_to],
          BccAddresses: (ref = eml_attributes.BccAddresses) != null ? ref : this.config["default"].BccAddresses,
          CcAddresses: (ref1 = eml_attributes.CcAddresses) != null ? ref1 : this.config["default"].CcAddresses
        },
        Source: (ref2 = eml_attributes.Source) != null ? ref2 : this.config["default"].Source,
        ReplyToAddresses: (ref3 = eml_attributes.ReplyToAddresses) != null ? ref3 : this.config["default"].ReplyToAddresses,
        ReturnPath: (ref4 = eml_attributes.ReturnPath) != null ? ref4 : this.config["default"].ReturnPath,
        Message: {
          Subject: {
            Data: (ref5 = eml_attributes.Subject) != null ? ref5 : 'Default Email Subject'
          },
          Body: {
            Html: {
              Data: this.template.render(eml_attributes.model, eml_attributes.tmpl, eml_attributes.page, data)
            },
            Text: {
              Data: (ref6 = eml_attributes.Text) != null ? ref6 : 'Default Email Text'
            }
          }
        }
      };
    };

    return SES;

  })();

  exports.SES = SES;

}).call(this);
