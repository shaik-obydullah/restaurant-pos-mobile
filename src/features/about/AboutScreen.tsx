import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {Colors} from '../../core/constants';

const AboutScreen = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>About</Text>
      <Text style={styles.item}>Developer: Shaik Obydullah</Text>
      <Text style={styles.item}>Version: 1.0.0</Text>
      <Text style={styles.item}>Website: obydullah.com</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 20,
  },
  item: {
    fontSize: 18,
    color: Colors.text,
    marginBottom: 8,
  },
});

export default AboutScreen;
