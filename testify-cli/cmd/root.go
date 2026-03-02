// automated-test-Testify-cli/cmd/root.go
package cmd

import (
	"os"
	"strings"

	"github.com/fatih/color"
	"github.com/spf13/cobra"
	"github.com/spf13/viper"
	"github.com/testify/cli-go/internal/style"
)

// rootCmd represents the base command when called without any subcommands
var rootCmd = &cobra.Command{
	Use:   "testify",
	Short: "Testify CLI",
	Long:  `A command-line interface to interact with the Testify API.`,
}

// Execute adds all child commands to the root command and sets flags appropriately.
func Execute() {
	if err := rootCmd.Execute(); err != nil {
		style.Error("%v", err)
		os.Exit(1)
	}
}

func init() {
	// Force color output on Windows
	color.NoColor = false

	cobra.OnInitialize(initConfig)

	rootCmd.Version = "1.0.0"

	// Define a persistent flag available to all subcommands.
	rootCmd.PersistentFlags().String("api-url", "http://localhost:3431/api/v1", "The base URL for the Testify API")

	// Bind the flag to Viper so its value can be overridden by environment variables or config files.
	viper.BindPFlag("api_url", rootCmd.PersistentFlags().Lookup("api-url"))
}

// initConfig reads in config file and ENV variables if set.
func initConfig() {
	// Find home directory.
	home, err := os.UserHomeDir()
	cobra.CheckErr(err)

	// Search for a config file named ".testify" (with a .yaml, .json, etc. extension) in the home directory.
	viper.AddConfigPath(home)
	viper.SetConfigName(".testify")
	viper.SetConfigType("yaml")

	// Tell Viper to also read environment variables.
	viper.SetEnvPrefix("TESTIFY")
	viper.SetEnvKeyReplacer(strings.NewReplacer("-", "_"))
	viper.AutomaticEnv()

	// If a config file is found, read it in.
	// We ignore the error if the file doesn't exist, as it will be created on 'config set'.
	_ = viper.ReadInConfig()
}
