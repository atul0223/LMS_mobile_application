import { View, Text, ScrollView, TextInput } from "react-native";
import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Homepage() {
  return (
    <SafeAreaView>
      <ScrollView>
        <View style={{padding:"5%"}}>
          <TextInput placeholder="Search ...." style={{width:"100%", borderWidth:2,borderRadius:50}}/>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
