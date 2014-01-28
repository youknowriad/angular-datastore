angular.module('angular-datastore').service('AngularDataSerializer', function() {

    /**
     * Array of model configs
     * @type {{}}
     */
    var models = {};

    return {

        addModel: function(type, model) {
            models[type] = model;
        },

        serialize: function(record, withPrimaryKey) {
            var hash = {};
            withPrimaryKey = withPrimaryKey || true;

            angular.forEach(record.getAttributes(), function(attribute) {
                if (withPrimaryKey || attribute !== record.getPrimaryKeyAttribute()) {
                    hash[attribute] = record[attribute];
                }
            }, this);

            angular.forEach(record.getHasManyAttributes(), function(relation, relationName) {
                switch (relation.type) {
                    case 'id':
                        if (record.isNew || record.__relations[relationName].loaded) {
                            var serials = [];
                            angular.forEach(record[relationName], function(subrecord) {
                                serials.push(subrecord.getPrimaryKey());
                            }, this);
                            hash[relationName] = serials;
                        } else {
                            hash[relationName] = record.__relations[relationName].unloadedValue;
                        }
                        break;
                    case 'embed':
                        var ids = [];
                        angular.forEach(record[relationName], function(subrecord) {
                            ids.push(this.serialize(subrecord, false));
                        }, this);
                        hash[relationName] = ids;
                        break;
                    default:
                        throw 'unknown relation type ' + relation.type;
                }
            }, this);

            angular.forEach(record.getHasOneAttributes(), function(relation, relationName) {
                switch (relation.type) {
                    case 'id':
                        if (record.isNew || record.__relations[relationName].loaded) {
                            hash[relationName] = record[relationName] ? record[relationName].getPrimaryKey() : null;
                        } else {
                            hash[relationName] = record.__relations[relationName].unloadedValue;
                        }
                        break;
                    case 'embed':
                        hash[relationName] = this.serialize(record[relationName], false);
                        break;
                    default:
                        throw 'unknown relation type ' + relation.type;
                }
            }, this);

            return hash;
        },

        unserialize: function(name, hash, store) {
            var record = new models[name]();
            this.hydrate(record, hash, store);

            return record;
        },

        hydrate: function(record, hash, store) {

            angular.forEach(record.getAttributes(), function(attribute) {
                record[attribute] = hash[attribute];
            }, this);

            angular.forEach(record.getHasManyAttributes(), function(relation, relationName) {
                switch (relation.type) {
                    case 'id':
                        var hasManyHash = hash[relationName] || [],
                            newObject = angular.isUndefined(record.__relations[relationName]);
                        if (newObject) {
                            record.__relations[relationName] = {
                                loaded: false,
                                value: [],
                                unloadedValue: hasManyHash,
                                load: function() {
                                    if (!this.loaded) {
                                        var self = this;
                                        this.loaded = true;
                                        store.findMany(relation.target, this.unloadedValue).then(function(newHasMany) {
                                            angular.forEach(newHasMany, function(record) {
                                                self.value.push(record);
                                            }, self);
                                        });
                                    }
                                }
                            };

                            Object.defineProperty(record, relationName, {
                                configurable: true,
                                get: function() {
                                    if (!record.__relations[relationName].loaded) {
                                        record.__relations[relationName].load();
                                    }
                                    return record.__relations[relationName].value;
                                },
                                set: function(value) {
                                    record.__relations[relationName].value = value;
                                }
                            });
                        } else if (record.__relations[relationName].loaded && !angular.equals(record.__relations[relationName].unloadedValue, hasManyHash)) {
                            record.__relations[relationName].loaded   = false;
                            record.__relations[relationName].unloadedValue = hasManyHash;
                            record.__relations[relationName].value.splice(0, record.__relations[relationName].value.length);
                            record.__relations[relationName].load();
                        } else {
                            record.__relations[relationName].unloadedValue = hasManyHash;
                        }

                        break;
                    case 'embed':
                        var subrecords = [];
                        angular.forEach(hash[relationName], function(subhash) {
                            subrecords.push(this.unserialize(relation.target, subhash, store));
                        }, this);
                        record[relationName] = subrecords;
                        break;
                    default:
                        throw 'unknown relation type ' + relation.type;
                }
            }, this);

            angular.forEach(record.getHasOneAttributes(), function(relation, relationName) {
                switch (relation.type) {
                    case 'id':
                        var hasOneHash = hash[relationName] || null,
                            newObject = angular.isUndefined(record.__relations[relationName]);
                        if (newObject) {
                            record.__relations[relationName] = {
                                loaded: false,
                                value: null,
                                unloadedValue: hasOneHash,
                                load: function() {
                                    if (!this.loaded) {
                                        var self = this;
                                        this.loaded = true;
                                        store.find(relation.target, hasOneHash).then(function(newHasOne) {
                                            self.value = newHasOne;
                                        });
                                    }
                                }
                            };

                            Object.defineProperty(record, relationName, {
                                configurable: true,
                                get: function() {
                                    if (!record.__relations[relationName].loaded) {
                                        record.__relations[relationName].load();
                                    }
                                    return record.__relations[relationName].value;
                                },
                                set: function(value) {
                                    record.__relations[relationName].value = value;
                                }
                            });
                        } else if (record.__relations[relationName].loaded && !angular.equals(record.__relations[relationName].unloadedValue, hasOneHash)) {
                            record.__relations[relationName].loaded   = false;
                            record.__relations[relationName].unloadedValue = hasOneHash;
                            record.__relations[relationName].value = null;
                            record.__relations[relationName].load();
                        } else {
                            record.__relations[relationName].unloadedValue = hasOneHash;
                        }

                        break;
                    case 'embed':
                        record[relationName] = hash[relationName] ? this.unserialize(relation.target, hash[relationName], store) : null;
                        break;
                    default:
                        throw 'unknown relation type ' + relation.type;
                }
            }, this);
        }

    };

});
